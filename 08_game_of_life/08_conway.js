/**
 * Created by reis on 7/30/15.
 */

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

            var cell_position = cell_key.split("_");
            var cell_x = parseInt(cell_position[0]);
            var cell_y = parseInt(cell_position[1]);

            var liveNeighbors = 0;

            for (var i = cell_x - 1; i<= cell_x + 1; i++) {
                if (i < 0 || i >= my.dimensions.x) {
                    continue;
                };
                for (var j = cell_y - 1; j<= cell_y + 1; j++) {
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
        var simulation = new Simulation();

        var fps = 30;
        var frameDuration = parseInt(1000/fps);

        var animate = function(){
            if(simulation){
                simulation.step();
                update_cells(simulation);

                setTimeout(animate, frameDuration);
            }
        };

        $("#button").click(function(){
            animate();
        });

        $("#submit").click(function(){
            var x = $("#rows").val();
            var y = $("#columns").val();
            simulation = new Simulation(x, y);
            create_grid(simulation);
        });

        create_grid(simulation);
    };

    init();

});

