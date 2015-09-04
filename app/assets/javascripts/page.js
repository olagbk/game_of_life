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
    }
}

var Simulation = function(prm_x, prm_y) {
    var rows = prm_x || 50;
    var columns = prm_y || 50;
    this.dimensions = {x: rows, y: columns};
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
                    $(".session-toggle").toggle();
                    $(".sidebar-box").hide();
                    $("#games").show();


                }
            }
        });
    }

    var fetch_games_list = function(){
        if(!localStorage.login_token){
            return;
        }

        $("#game-panel").show();
        $("#games").show();
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

                    create_grid(simulation);
                    update_cells(simulation);

                    localStorage.last_game = game_id;
                    $(".sidebar-box").hide();
                    $("#game-panel").show();
                    $("#game-name").html(game_obj.name);

                }
            })
        });
    };

    var update_cells = function(simulation){
        draw_canvas();
        $.each(simulation.cells, function(cell_key) {
            var coords = Helpers.get_coords(cell_key);
            paint_cell(coords[0], coords[1]);
        });
//            $("[x-data-coord="+cell_key+"]").addClass("active");
//        });
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
                $("#save-form").hide();
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
                flash_alert_message('#saved-alert')
            }
        })
    }

    var flash_alert_message = function(id){
        $(id).show();
        $(id).delay(2000).fadeOut('fast');
    };
    var paint_cell = function(x, y){
        ctx.fillStyle = "white";
        ctx.fillRect(x*cw, y*cw, cw, cw);
        ctx.strokeStyle = "grey";
        ctx.strokeRect(x*cw, y*cw, cw, cw);
    };
    var blank_cell = function(x, y){
        ctx.fillStyle = "black";
        ctx.fillRect(x*cw, y*cw, cw, cw);
        ctx.strokeStyle = "grey";
        ctx.strokeRect(x*cw,y*cw,cw,cw);

    };

    var canvas = $("#grid")[0];
    var ctx = canvas.getContext('2d');
    var cw = 10;
    var draw_canvas = function(){
        var width = 50 * cw;
        var height = 50 * cw;
        //$("#grid").css("width", width);
        //$("#grid").css("height", height);

        var cells = [];



        for (var i=0;i<60;i++){
            for (var j=0;j<60;j++){
                blank_cell(i, j);
            }
        };
    };
    $('#grid').click(function (e) {

        var clickedX = e.pageX - this.offsetLeft;
        var clickedY = e.pageY - this.offsetTop;
        var coords = [Math.floor(clickedX/cw), Math.floor(clickedY/cw)];
        var coord_id = Helpers.get_cell_key(coords[0], coords[1]);
        console.log(coords);
        console.log(coord_id);
        var cell_data = simulation.cells[coord_id];
        (cell_data) ? blank_cell(coords[0], coords[1]) : paint_cell(coords[0], coords[1]);
        if(cell_data) {
            delete simulation.cells[coord_id];
        }
        else {
            simulation.cells[coord_id] = true;
        }
     });


    var create_grid = function(simulation){
        $("#grid").empty();
        for(var coord_x = 0; coord_x < simulation.dimensions.x; coord_x++){
            for(var coord_y = 0; coord_y < simulation.dimensions.y; coord_y++){
                var cell_el = $("<div></div>");
                $("#grid").append(cell_el);
                cell_el.addClass("cell");
                cell_el.attr("x-data-coord", (coord_x + "_" + coord_y));
            };
        };

        var cell_width = 12;
        $("#grid").css("width", (simulation.dimensions.x * cell_width).toString()  + "px");
        $("#grid").css("height", (simulation.dimensions.y * cell_width).toString()  + "px");

        $(".cell").click(function(){
            var coord_id = $(this).attr("x-data-coord");
            var cell_data = simulation.cells[coord_id];
            var desired_action = (cell_data)? "removeClass" : "addClass";
            $(this)[desired_action]("active");
            if(cell_data) {
                delete simulation.cells[coord_id];
            }
            else {
                simulation.cells[coord_id] = true;
            }
        });
    };

    var init = function(){
        draw_canvas();
        var fps = 10;
        var frameDuration = parseInt(1000/fps);

        var animate = function(){
            if(simulation){
                simulation.step();
                update_cells(simulation);

                setTimeout(animate, frameDuration);
            }
        };

        localStorage.removeItem("last_game");

        if (localStorage.login_token){
            $(".logged-in").not("#game-panel").show();
            $("#login-link").hide();
            $("#game-panel").hide();
        }
//        else {
//            $("#login-form").show();
//        }

        //handlers for navigation bar elements

        $("#signup-link").click(function(){
            if (localStorage.login_token) {
                flash_alert_message('#logged-in-warning')
            }
            else {
                $(".sidebar-box").not("#signup-form").hide();
                $("#signup-form").toggle();
            }
        });
        $("#login-link").click(function(){
            if (localStorage.login_token) {
                flash_alert_message('#logged-in-warning')
            }
            else {
                $(".sidebar-box").not("#login-form").hide();
                $("#login-form").toggle();
            }
        });
        $("#dimensions-link").click(function(){
            $(".sidebar-box").not("#dimensions-form").not("#game-panel").hide();
            $("#dimensions-form").toggle();
        });
        $("#run-link").click(function(){
            animate();
        });
        $("#reset-link").click(function(){
            simulation.cells = {};
            update_cells(simulation);
        });

        //handlers for buttons

        $("#signup-button").click(function(){
            $("#signup-form").hide();
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
            $("#login-form").hide();
            var username = $("#login-name").val();
            var password = $("#login-password").val();
            init_session(username, password);

        });

        $("#resize-grid").click(function(){
            $("#resize-grid").hide();
            var x = $("#rows").val();
            var y = $("#columns").val();
            simulation = new Simulation(x, y);
            create_grid(simulation);
        });

        $("#logout-link").click(function(){
            localStorage.removeItem("login_token");
            $(".logged-in").hide();
            $("#login-link").show();
        });

        //handlers for game management elements


        $("#add-link").click(function(){
            $(".sidebar-box").not("#save-form").hide();
            $("#save-form").toggle();
        })

        $("#add-button").click(function(){
            add_game();
        });

        $("#update-link").click(function(){
            save_game();
        });
    };

    create_grid(simulation);
    setHeaders();
    fetch_games_list();
    init();
});
