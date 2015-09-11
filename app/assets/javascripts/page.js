//rivvel@gmail.com, 09/2015

var Helpers = {
    get_coords: function(cell_key) {
        var cell_position = cell_key.split("_");
        var x = parseInt(cell_position[0]);
        var y = parseInt(cell_position[1]);
        return [x, y];
    },
    get_cell_key: function(x, y) {
        return x + "_" + y;
    },
    flash_alert: function(id){
        $(id).show();
        $(id).delay(2000).fadeOut('fast');
    },
    in_bounds: function(x, y, container_x, container_y) {
        return !((x >= container_x) || (y >= container_y));
    }
};

var Simulation = function(prm_x, prm_y) {
    var columns = prm_x || 80;
    var rows = prm_y || 50;
    this.dimensions = {x: columns, y: rows};
    this.cells = {};
    this.living_cells = 0;
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
                }
                for (var j = coords[1] - 1; j<= coords[1] + 1; j++) {
                    if (j < 0 || j >= my.dimensions.y) {
                        continue;
                    }
                    var neighborKey = Helpers.get_cell_key(i, j);

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
                        }
                    }
                }
            }
            if ((liveNeighbors < 2) || (liveNeighbors > 3)) {
                cellsToDelete.push(cell_key);

            }
        });
        my.living_cells -= cellsToDelete.length;
        $.each(cellsToDelete, function(idx, cell_key) {

            delete my.cells[cell_key];
        });
        $.each(deadNeighbors, function (neighbor_key) {

            if (deadNeighbors[neighbor_key] == 3) {

                my.cells[neighbor_key] = true;
                my.living_cells += 1;
            }
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

    var set_logged_in = function(is_logged_in){
        var desired_method = ((is_logged_in)? "addClass" : "removeClass");
        $("#navigation")[desired_method]("is-logged-in");
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
                    set_logged_in(true);
                    setHeaders();
                    fetch_games_list();
                }
            }
        });
    };

    var Game = function(){
        var my = this;
        this.columns = simulation.dimensions.x;
        this.rows = simulation.dimensions.y;
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
            return;}
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
            delete_game(game_id);
        });
        $("a.game-item").click(function() {
            var game_id = $(this).attr('id');
            fetch_game(game_id);
            localStorage.last_game = game_id;
        });
    };

    var fetch_game = function(id){
        $.ajax({
            url: "/api/games/" + id,
            method: "GET",

            success: function(game_obj) {

                simulation.dimensions.x = game_obj.columns;
                simulation.dimensions.y = game_obj.rows;
                simulation.cells = {};
                Data.reset();

                $.each (game_obj.living_cells, function(cell_index, cell_obj) {
                    var cell_key = Helpers.get_cell_key(cell_obj.row, cell_obj.column);
                    simulation.cells[cell_key] = true;
                    simulation.living_cells +=1;
                });

                update_cells(simulation);
                Data.count();

                $("#game-panel").show();
                $("#game-name").text(game_obj.name);
            }
        })
    };

    var delete_game = function(id){
        $.ajax({
            url: "/api/games/" + id,
            method: "DELETE",
            data: {
                game: {
                    "id": id
                }
            },
            success: function(games_array) {
                render_games_list(games_array);
            }
        })
    };

    var add_game = function() {
        var game = new Game();
        game.name = $("#game-title").val();
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
        var id = localStorage.last_game;
        $("#saving-alert").show();
        $.ajax({
            url: "/api/games/" + id,
            method: "PUT",
            data: {
                game: {
                    "rows": game.rows,
                    "columns": game.columns,
                    "id": id
                },
                living_cells: game.living_cells
            },
            success: function(games_array) {
                $("#saving-alert").hide();
                Helpers.flash_alert('#saved-alert')
            }
        })
    };

    var generation = 0;
    var fps = 20;
    var frameDuration = function(){
        return parseInt(1000/fps);
    };

    var StatElements = {
        generation: $("#game-generation"),
        cells: $("#game-cells"),
        dimensions: $("#game-dimensions"),
        game_fps: $("#game-fps"),
        real_fps: $("#real-fps")
        };

    var Data = {
        count: function(){
            StatElements.cells.text(simulation.living_cells);
        },
        generation: function(){
            generation += 1;
            StatElements.generation.text(generation);
        },
        dimensions: function(){
            var dimensions_str = simulation.dimensions.y + "x" + simulation.dimensions.x;
            StatElements.dimensions.text(dimensions_str);
        },
        frames: function(){
            StatElements.game_fps.text(fps);
        },
        real_fps: function(fps){
            StatElements.real_fps.text("(" + fps + ")");
        },
        reset: function(){
            simulation.living_cells = 0;
            generation = 0;
            this.count();
            this.generation();
        }

    };

    //canvas stuff

    var canvas = $("#grid")[0];
    var ctx = canvas.getContext('2d');
    var cs = 10;

    var grid_x = cs * simulation.dimensions.x;
    var grid_y = cs * simulation.dimensions.y;

    var draw_canvas = function(simulation){

        //canvas dimensions
        var width = $("#grid").width();
        var height =$("#grid").height();

        var x = simulation.dimensions.x;
        var y = simulation.dimensions.y;

        //calculate cell side
        var cw = (width / x);
        var ch = (height / y);
        cs = (cw > ch)? ch : cw;

        //game dimensions
        grid_x = (cs * simulation.dimensions.x);
        grid_y = (cs * simulation.dimensions.y);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        $("#content").width(grid_x).height(grid_y);

        //generate empty grid
        for (var i=0;i<x;i++){
            for (var j=0;j<y;j++){
                blank_cell(i, j);
            }
        }
    };

    var mouseDown = false;
    var coords;
    var mx, my;

    var update_cells = function(simulation){
        draw_canvas(simulation);
        $.each(simulation.cells, function(cell_key) {
            var coords = Helpers.get_coords(cell_key);
            paint_cell(coords[0], coords[1]);
        });
    };

    var add_cell = function (coords) {
        var coord_id = Helpers.get_cell_key(coords[0], coords[1]);
        if (simulation.cells[coord_id]) {
            return;}
        simulation.cells[coord_id] = true;
        simulation.living_cells +=1;
        paint_cell(coords[0], coords[1]);
        Data.count();
    };

    var delete_cell = function(coords) {
        var coord_id = Helpers.get_cell_key(coords[0], coords[1]);
        delete simulation.cells[coord_id];
        simulation.living_cells -=1;
        blank_cell(coords[0], coords[1]);
        Data.count();
    };
    var select_cell = function(coords){
        var coord_id = Helpers.get_cell_key(coords[0], coords[1]);
        var cell_data = simulation.cells[coord_id];
        if(cell_data) {
            delete_cell(coords);
        }
        else {
            add_cell(coords);

        }
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

    canvas.onmousedown = function(e){
        mouseDown = true;

        var clickedX = e.pageX - this.offsetLeft;
        var clickedY = e.pageY - this.offsetTop;

        var is_valid = Helpers.in_bounds(clickedX, clickedY, grid_x, grid_y);

        if (is_valid == false) {
            return;
        }
        //get cell coordinates
        coords = [Math.floor(clickedX/cs), Math.floor(clickedY/cs)];
        select_cell(coords);

        canvas.onmousemove = function(e){

            //get updated mouse coordinates
            var getMouse = function(e) {
                var element = canvas, offsetX = 0, offsetY = 0;
                if (element.offsetParent) {
                    do {
                        offsetX += element.offsetLeft;
                        offsetY += element.offsetTop;
                    } while ((element = element.offsetParent));
                }
                mx = e.pageX - offsetX;
                my = e.pageY - offsetY
            };
            getMouse(e);

            coords = [Math.floor(mx/cs), Math.floor(my/cs)];
            is_valid = Helpers.in_bounds(mx, my, grid_x, grid_y);
            if (is_valid) {
            add_cell(coords);
            }


        }
    };
    canvas.onmouseup = function(){
        mouseDown = false;
        canvas.onmousemove = null;
    };

    var reset_grid = function(){
        simulation.cells = {};
        simulation.living_cells = 0;
        update_cells(simulation);
        Data.reset();
    };

    var init = function(){

        var idle = true;
        var lastLoop;

        draw_canvas(simulation);
        fetch_games_list();

        Data.reset();
        Data.dimensions();
        Data.frames();


        var animate = function(){

            if(simulation){
                simulation.step();
                update_cells(simulation);
                Data.count();
                Data.generation();

                //calculates actual frame rate
                var thisLoop = new Date;
                var fps = parseFloat(1000 / (thisLoop - lastLoop)).toFixed(2);
                lastLoop = thisLoop;
                Data.real_fps(fps);

            }

            if (!idle){
                setTimeout(animate, frameDuration());
            }
        };

        localStorage.removeItem("last_game");
        $("#game-panel").hide();

        if (localStorage.login_token){
            set_logged_in(true);
        }

        //handlers for navigation bar elements

        $("#run-link").click(function(){
            idle = (!idle);
            animate();
            if (idle) {
                $(this).html("run simulation")
            }
            else {
                $(this).html("stop simulation")
            }
        });
        $("#reset-link").click(function(){
            reset_grid();
        });

        $("#logout-link").click(function(){
            $("#game-panel").hide();
            localStorage.removeItem("login_token");
            set_logged_in(false);
            reset_grid();

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
            Data.reset();
            Data.dimensions();
            update_cells(simulation);

        });

        $("#fps-button").click(function(){
            fps = $("#fps").val();
            Data.frames();
        });

        //handlers for game management elements

        $("#add-button").click(function(){
            add_game();
        });
        $("#update-link").click(function(){
            save_game();
        });
        $("#reload-link").click(function(){
            fetch_game(localStorage.last_game);
        });
        $("#close-link").click(function(){
            $("#game-panel").hide();
            reset_grid();
        })
        };

    setHeaders();
    init();
});
