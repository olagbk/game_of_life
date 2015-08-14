/**
 * Created by reis on 8/4/15.
 */
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

    var setHeaders = function(){
        $.ajaxSetup({
            headers: {"x-login-token": localStorage.login_token}
        });
    };


    var simulation = new Simulation();

    var fetch_games_list = function(){
        if(!localStorage.login_token){
            return;
        }

        $("#logout").show();
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
            $("#games-list").append("<li><a href='#' class='game-item' id="+game_obj.id+">"+game_obj.name+"</a><a class='delete-link' href='#' id="+game_obj.id+"> Delete</a></li>");
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
                data: {
                    game: {
                        "id": game_id
                    }
                },
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

                }
            })
        });
    };

    var update_cells = function(simulation){
        $(".active").removeClass("active");
        $.each(simulation.cells, function(cell_key) {
            $("[x-data-coord="+cell_key+"]").addClass("active");
        });
    };

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
        setHeaders();
        fetch_games_list();

        var fps = 10;
        var frameDuration = parseInt(1000/fps);

        var animate = function(){
            if(simulation){
                simulation.step();
                update_cells(simulation);

                setTimeout(animate, frameDuration);
            }
        };
        var update_games = function(games_array) {
            $.each (games_array, function(game_index, game_obj) {
                $("#games-list").append("<li>"+game_obj.name+"</li>");
            });
        };



        $("#run-button").click(function(){
            animate();
        });

        $("#reset-button").click(function(){

        });

        $("#dimensions-link").click(function(){
            $("#dimensions-form").toggle();
        });

        $("#resize-grid").click(function(){
            $("#dimensions-form").toggle();
            var x = $("#rows").val();
            var y = $("#columns").val();
            simulation = new Simulation(x, y);
            create_grid(simulation);
        });


        $("#signup-link").click(function(){
            $("#signup-form").toggle();
        });

        $("#signup-button").click(function(){
            $("#signup-form").toggle();
            var signup_name = $("#signup-name").val();
            var signup_password = $("#signup-password").val();
            $.ajax({
                url: "/api/users",
                method: "POST",
                data: {
                    user: {
                        "name": signup_name,
                        "password": signup_password
                    }
                },
                success: function(user){
                    console.log(user);
                }
            });

        });

        $("#login-link").click(function(){
            $("#login-form").toggle();
        });

        $("#login-button").click(function(){
            $("#login-form").toggle();

            var login_name = $("#login-name").val();
            var login_password = $("#login-password").val();
            $.ajax({
                url: "/api/users/verify",
                method: "GET",
                data: {
                    user: {
                        "name": login_name,
                        "password": login_password
                    }
                },
                success: function(token_obj){
                    if (token_obj) {
                        localStorage.login_token = token_obj.token;
                        $("#login").css("display", "none");
                        $("#logout").css("display", "inline");

                        setHeaders();
                        fetch_games_list();

                    }
                }
            });

        });

        $("#logout-button").click(function(){
            localStorage.removeItem("login_token");
            $("#login").css("display", "inline");
            $("#logout").css("display", "none");
            $("games").hide();
        });


        $("#add-link").click(function(){
            $("#save-form").toggle();
            if (!localStorage.login_token) {
                $("#no-user-warning").show();
            }
        })
        $("#add-button").click(function(){
            var game_name = $("#game-title").val();
            var game_rows = simulation.dimensions.x;
            var game_columns = simulation.dimensions.y;
            var living_cells = [];
            $.each(simulation.cells, function(cell_key) {

                var cell_position = cell_key.split("_");
                var cell_x = parseInt(cell_position[0]);
                var cell_y = parseInt(cell_position[1]);
                living_cells.push([cell_x, cell_y]);

            });

            $.ajax({
                url: "/api/games",
                method: "POST",
                headers: {"x-login-token": localStorage.login_token},
                data: {
                    game: {
                        "name": game_name,
                        "rows": game_rows,
                        "columns": game_columns
                    },
                    living_cells: living_cells
                },
                success: function(games_array) {
                    render_games_list(games_array);

                }
            })


        });


        create_grid(simulation);
    };

    init();

});
