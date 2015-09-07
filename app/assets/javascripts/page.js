/**
 * Created by reis on 7/30/15.
 */

var Helpers = {
    get_coords: function(cell_key) {
        var cell_position = cell_key.split("_");
        var x = parseInt(cell_position[0]);
        var y = parseInt(cell_position[1]);
        var coords = [x, y];
        return coords;
    },
    get_cell_key: function(x, y) {
        var cell_key = x + "_" + y;
        return cell_key;
    },
    flash_alert_message: function(id){
        $(id).show();
        $(id).delay(2000).fadeOut('fast');
    }
}

var Simulation = function(prm_x, prm_y) {
    var columns = prm_x || 75;
    var rows = prm_y || 50;
    this.dimensions = {x: columns, y: rows};
    this.cells = {};

    this.step = function() {
        var my = this;
        var deadNeighbors = {}; //stores keys of inactive neighbors with number of occurrences as value. An inactive cell with 3 live neighbors becomes active.
        var cellsToDelete = []; //active cells with < two or > three active neighbors

        $.each(this.cells, function(cell_key) {

            var coords = Helpers.get_coords(cell_key);
            var liveNeighbors = 0;

            for (var i = coords[0] - 1; i<= coords[0] + 1; i++) {
                if (i < 0 || i >= my.dimensions.x) {
                    continue;
                };
                for (var j = coords[1] - 1; j<= coords[1] + 1; j++) {
                    if (j < 0 || j >= my.dimensions.y) {
                        continue;
                    };
                    var neighborKey = (i + "_" + j);

                    if (neighborKey != cell_key) {

                        if (my.cells[neighborKey]) {
                            liveNeighbors += 1;
                        }
                        else {
                            if (deadNeighbors[neighborKey]) {
                                (deadNeighbors[neighborKey]) += 1;
                            }
                            else {
                                (deadNeighbors[neighborKey]) = 1;
                            }
                        };
                    };
                };
            };
            if ((liveNeighbors < 2) || (liveNeighbors > 3)) {
                cellsToDelete.push(cell_key);
            };
        });
        $.each(cellsToDelete, function(idx, cell_key) {

            delete my.cells[cell_key];
        });
        $.each(deadNeighbors, function (neighbor_key) {

            if (deadNeighbors[neighbor_key] == 3) {

                my.cells[neighbor_key] = true;
            };
        });
    };
};

$(document).ready(function() {

    var simulation = new Simulation();

    var setHeaders = function(){
        $.ajaxSetup({
            headers: {"x-login-token": localStorage.login_token}
        });
    };

    var init_session = function(username, password) {
        $.ajax({
            url: "/api/users/verify",
            method: "GET",
            data: {
                user: {
                    "name": username,
                    "password": password
                }
            },
            success: function(token_obj){
                if (token_obj) {
                    localStorage.login_token = token_obj.token;
                    setHeaders();
                    fetch_games_list();
                    $(".logged-in").show();
                    $(".logged-out").hide();
                }
            }
        });
    };

    var Game = function(){
        var my = this;
        this.name = $("#game-title").val();
        this.rows = simulation.dimensions.x;
        this.columns = simulation.dimensions.y;
        this.living_cells = [];

        this.createCells = function(){

            $.each(simulation.cells, function(cell_key) {
                var coords = Helpers.get_coords(cell_key);
                my.living_cells.push([coords[0], coords[1]]);
            });
        };
        this.createCells();
    };

    var fetch_games_list = function(){

        if(!localStorage.login_token){
            return;
        };
        $.ajax({
            url: "/api/games",
            method: "GET",
            success: function(games_array) {
                render_games_list(games_array);
            }
        });
    };

    var render_games_list = function(games_array){

        $("#games-list").empty();

        $.each (games_array, function(game_index, game_obj) {
            $("#games-list").append("<li><a href='#' class='game-item' id="+game_obj.id+">"+game_obj.name+"</a><a class='delete-link' href='#' id="+game_obj.id+"> [delete]</a></li>");
        });

        $("a.delete-link").click(function(){
            var game_id = $(this).attr('id');
            $.ajax({
                url: "/api/games/" + game_id,
                method: "DELETE",
                data: {
                    game: {
                        "id": game_id
                    }
                },
                success: function(games_array) {
                    render_games_list(games_array);
                }
            })
        });
        $("a.game-item").click(function() {
            var game_id = $(this).attr('id');
            $.ajax({
                url: "/api/games/" + game_id,
                method: "GET",

                success: function(game_obj) {

                    simulation.dimensions.x = game_obj.rows;
                    simulation.dimensions.y = game_obj.columns;
                    simulation.cells = {};

                    $.each (game_obj.living_cells, function(cell_index, cell_obj) {
                        var cell_key = Helpers.get_cell_key(cell_obj.row, cell_obj.column);
                        simulation.cells[cell_key] = true;
                    });

                    update_cells(simulation);

                    localStorage.last_game = game_id;
                    $("#game-panel").show();
                    $("#game-name").html(game_obj.name);
                }
            })
        });
    };

    var add_game = function() {
        var game = new Game();
        $.ajax({
            url: "/api/games",
            method: "POST",
            data: {
                game: {
                    "name": game.name,
                    "rows": game.rows,
                    "columns": game.columns
                },
                living_cells: game.living_cells
            },
            success: function(games_array) {
                render_games_list(games_array);
            }
        })
    };
    var save_game = function(){
        var game = new Game();
        var game_id = localStorage.last_game;
        $("#saving-alert").show();
        $.ajax({
            url: "/api/games/" + game_id,
            method: "PUT",
            data: {
                game: {
                    "rows": game.rows,
                    "columns": game.columns,
                    "id": game_id
                },
                living_cells: game.living_cells
            },
            success: function(games_array) {
                $("#saving-alert").hide();
                Helpers.flash_alert_message('#saved-alert')
            }
        })
    }

    //canvas stuff

    var canvas = $("#grid")[0];
    var ctx = canvas.getContext('2d');
    var cs = 10;

    var draw_canvas = function(simulation){

        //canvas dimensions
        var width = $("#grid").width();
        var height =$("#grid").height();

        //game dimensions
        var x = simulation.dimensions.x;
        var y = simulation.dimensions.y;

        //calculate cell side
        var cw = (width / x);
        var ch = (height / y);
        cs = (cw > ch)? ch : cw;

        //calculate new canvas dimensions
        var new_width = (cs * x);
        var new_height = (cs * y);

        //resize the canvas

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        //generate empty grid
        for (var i=0;i<x;i++){
            for (var j=0;j<y;j++){
                blank_cell(i, j);
            }
        };
    };
    var update_cells = function(simulation){
        draw_canvas(simulation);
        $.each(simulation.cells, function(cell_key) {
            var coords = Helpers.get_coords(cell_key);
            paint_cell(coords[0], coords[1]);
        });
    };
    var paint_cell = function(x, y){
        ctx.fillStyle = "white";
        ctx.fillRect(x*cs, y*cs, cs, cs);
        ctx.strokeStyle = "grey";
        ctx.strokeRect(x*cs, y*cs, cs, cs);
    };
    var blank_cell = function(x, y){
        ctx.fillStyle = "black";
        ctx.fillRect(x*cs, y*cs, cs, cs);
        ctx.strokeStyle = "grey";
        ctx.strokeRect(x*cs,y*cs,cs,cs);
    };

    var mouseDown = false;
    var coords, coord_id;
    var mx, my;

    canvas.onmousedown = function(e){
        mouseDown = true;

        //get click coordinates
        var clickedX = e.pageX - this.offsetLeft;
        var clickedY = e.pageY - this.offsetTop;

        //get cell coordinates
        coords = [Math.floor(clickedX/cs), Math.floor(clickedY/cs)];
        coord_id = Helpers.get_cell_key(coords[0], coords[1]);

        //update canvas state
        var select_cells = function(){
            var cell_data = simulation.cells[coord_id];
            (cell_data) ? blank_cell(coords[0], coords[1]) : paint_cell(coords[0], coords[1]);
            if(cell_data) {
                delete simulation.cells[coord_id];
            }
            else {
                simulation.cells[coord_id] = true;
            };
        };
        select_cells();

        canvas.onmousemove = function(e){

            //get updated mouse coordinates
            var getMouse = function(e) {
                var element = canvas, offsetX = 0, offsetY = 0;

                if (element.offsetParent) {
                    do {
                        offsetX += element.offsetLeft;
                        offsetY += element.offsetTop;
                    } while ((element = element.offsetParent));
                };
                mx = e.pageX - offsetX;
                my = e.pageY - offsetY
            };
            getMouse(e);

            coords = [Math.floor(mx/cs), Math.floor(my/cs)];
            coord_id = Helpers.get_cell_key(coords[0], coords[1]);
            select_cells();

        }
    };
    canvas.onmouseup = function(){
        mouseDown = false;
        canvas.onmousemove = null;
    }

    var init = function(){

        var fps = 30;
        var frameDuration = parseInt(1000/fps);
        var idle = true;

        draw_canvas(simulation);

        var animate = function(){
            if(simulation){
                simulation.step();
                update_cells(simulation);
                if (!idle){
                    setTimeout(animate, frameDuration);
                }
            }
        };

        localStorage.removeItem("last_game");
        $("#game-panel").hide();

        if (localStorage.login_token){
            $(".logged-in").show();
            $(".logged-out").hide();
        }

        //handlers for navigation bar elements

        $("#run-link").click(function(){
            idle = (idle)? false : true;
            animate();
        });
        $("#reset-link").click(function(){
            simulation.cells = {};
            update_cells(simulation);
        });

        //handlers for buttons

        $("#signup-button").click(function(){
            var username = $("#signup-name").val();
            var password = $("#signup-password").val();
            $.ajax({
                url: "/api/users",
                method: "POST",
                data: {
                    user: {
                        "name": username,
                        "password": password
                    }
                },
                success: function(user){
                    init_session(username, password);
                }
            });
        });

        $("#login-button").click(function(){
            var username = $("#login-name").val();
            var password = $("#login-password").val();
            init_session(username, password);
        });

        $("#resize-grid").click(function(){
            var x = $("#columns").val();
            var y = $("#rows").val();
            simulation = new Simulation(x, y);
            update_cells(simulation);
        });

        $("#logout-link").click(function(){
            localStorage.removeItem("login_token");
            $(".logged-in").hide();
            $(".logged-out").show();
        });

        //handlers for game management elements

        $("#add-button").click(function(){
            add_game();
        });

        $("#update-link").click(function(){
            save_game();
        });
    };

    setHeaders();
    fetch_games_list();
    init();
});
