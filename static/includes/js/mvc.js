var flowchart = (function () {
    
    var edgeInputDict = {};


    ///////////////////////////////////////
    /////
    /////        MODEL
    /////
    ///////////////////////////////////////
    /*
    Keeps the internal state of the flowchart : components
    connections etc
    and updates the view accordingly
    */
    function Model() {
        var fc = FC(),
            exports = {},
            handler = UpdateHandler(),
            components = {},
            connections = [];
        
        /*
        Button for solving the system
        Checks to see if Graph is valid.
        Creates a JSON String that represents the OFFL graph made which is then sent over to 
        the Python back-end.
        */
        function solve(btn) {

            var flag = true;
            // First check and see if graph is valid, if not, return error
            var connections = jsPlumb.getAllConnections();
            //Checks if there are no connections
            if (connections.length === 0){
                flag = false;
                $('.remove').remove();
                $('.hint').append("<p class='remove'><strong>There are no connections!</strong></p>");
                $('#warningModal').modal('show');
            }
            for(c in connections) {
                var connection = connections[c];
                var sourceType = $('#'+connection.sourceId).attr('data-type');
                var targetType = $('#'+connection.targetId).attr('data-type');
                //Checks if same type of nodes are connected
                if (sourceType === targetType){
                    flag = false;
                    $('.remove').remove();
                    $('.hint').append("<p class='remove'> Check your connections. You connected two components of the same type!</p>");
                    $('#warningModal').modal('show');
                }
            }

            if(flag){
                // Create JSON
                var speciesValueList = [];
                var speciesIdValueDict = {};
                var speciesInitialList = [];
                $(".speciesInput").each(function() {
                    var id = $(this).attr('id');
                    var value = $(this).val();
                    speciesValueList.push(value.toUpperCase());
                    speciesIdValueDict[id] = value.toUpperCase();

                    var initial = $('#'+id+'Input').val();
                    speciesInitialList.push(initial);

                    //Checks if all species have names
                    if (value === ""){
                        flag = false;
                        $('.remove').remove();
                        $('.hint').append("<p class='remove'> Check your inputs. You forgot to name a Species!</p>");
                        $('#warningModal').modal('show');
                    }
                    //Checks if all species have initials
                    if (initial === ""){
                        flag = false;
                        $('.remove').remove();
                        $('.hint').append("<p class='remove'> Check your inputs. You forgot to give all Species an initial population!</p>");
                        $('#warningModal').modal('show');
                    }
                });
                var speciesString = JSON.stringify(speciesValueList);
                var speciesList = '"speciesList": ' + speciesString;
                var initialString = '"initialValues":'+JSON.stringify(speciesInitialList);
                
                //Checks if any two species share a name
                speciesValueList.sort();
                var results = [];
                for (var i = 0; i < speciesValueList.length - 1; i++) {
                    if (speciesValueList[i + 1] == speciesValueList[i]) {
                        results.push(speciesValueList[i]);
                    }
                }
                if (results.length > 0){
                    flag = false;
                    $('.remove').remove();
                    $('.hint').append("<p class='remove'> Check your inputs. All Species names must be unique. You duplicated Species names!</p>");
                    $('#warningModal').modal('show');
                }
                

                var interactionIdValueDict = {};
                var interactionIDList = [];
                $(".interactionInput").each(function() {
                    var id = $(this).attr('id');
                    var value = $(this).val();

                    interactionIdValueDict[id] = value;
                    interactionIDList.push(id);

                    //Checks if all interactions have rates
                    if (value === ""){
                        flag = false;
                        $('.remove').remove();
                        $('.hint').append("<p class='remove'> Check your inputs. You forgot to give all of your Interactions rates!</p>");
                        $('#warningModal').modal('show');
                    }
                });

                var edgeIdValueDict = {};
                $("._jsPlumb_overlay").each(function() {
                    var id = $(this).attr('id');
                    var value = $(this).val();
                    edgeIdValueDict[id] = value;

                    //Checks if all edges have rates
                    if (value === ""){
                        flag = false;
                        $('.remove').remove();
                        $('.hint').append("<p class='remove'> Check your inputs. You forgot to give all of your edges rates!</p>");
                        $('#warningModal').modal('show');
                    }
                });

                var edgeConnValueDict = {};
                for(id in edgeIdValueDict){
                    edgeConnValueDict[edgeIdValueDict[id]] = edgeInputDict[id];
                }

                var tempList = [];
                for(i in interactionIDList){
                    var ID = interactionIDList[i];
                    var temp = '';
                    temp += '{"interactionFunction":"' + interactionIdValueDict[ID] + '",';
                    var sourceList = [];
                    var targetList = [];
                    var sourceValue;
                    var targetValue;
                    var sourceWeight = 1;
                    var targetWeight = 1;

                    for(c in connections) {
                        var connection = connections[c];
                        var sourceEnd = connection.sourceId;
                        var targetEnd = connection.targetId;

                        for(value in edgeConnValueDict){
                            var conn = edgeConnValueDict[value];
                            var connSource = conn.sourceId;
                            var connTarget = conn.targetId;

                            if(connSource === sourceEnd & connTarget === ID){
                                targetWeight = value;
                            }
                            if(connSource === ID & connTarget === targetEnd){
                                sourceWeight = value;
                            }
                        }

                        if(ID === targetEnd){
                            targetValue = speciesIdValueDict[sourceEnd];
                            sourceList.push('{"weight":"' + targetWeight + '","species":"' + targetValue + '"}');
                        }
                        if(ID === sourceEnd){
                            sourceValue = speciesIdValueDict[targetEnd];
                            targetList.push('{"weight":"' + sourceWeight + '","species":"' + sourceValue + '"}');
                        }
                    }
                    
                    var sJoin = sourceList.join();
                    var tJoin = targetList.join();

                    //Checks if all interactions are complete
                    if (sJoin === "" | tJoin === ""){
                        flag = false;
                        $('.remove').remove();
                        $('.hint').append("<p class='remove'> Check your inputs. Not all of your interactions are complete!</p>");
                        $('#warningModal').modal('show');
                        break;
                    }

                    var sourceEdges = '"sourceEdges":[' + sJoin + ']';
                    var targetEdges = ',"targetEdges":[' + tJoin + ']';
                    temp += sourceEdges;
                    temp += targetEdges;
                    temp += '}';
                    tempList.push(temp);
                };

                var startTime = '"initialTime":' + $('#startTime').val();
                var endTime = '"endTime":' + $('#endTime').val();
                var variable = '"independentVariable":' + JSON.stringify($('#variable').val());
                    //Checks if all inputs are full
                    if (($('#startTime').val() === "") | ($('#endTime').val() === "") | ($('#variable').val() === "")){
                        flag = false;
                        $('.remove').remove();
                        $('.hint').append("<p class='remove'> Check your inputs. You need to clarify an Initial Time, End Time or Variable!</p>");
                        $('#warningModal').modal('show');
                    }
                    //Checks if endTime is greater than startTime
                    if ((($('#startTime').val() != "") | ($('#endTime').val() != "")) & ($('#startTime').val() >= $('#endTime').val())){
                        flag = false;
                        $('.remove').remove();
                        $('.hint').append("<p class='remove'> Check your time inputs. Your Start Time must be less than your End Time!</p>");
                        $('#warningModal').modal('show');
                    }


                var tempJoin = tempList.join();
                var interactionList = '"interactionList":[' + tempJoin + ']';
                var flowChart = '{'+ interactionList + ',' + speciesList + ',' + initialString + ',' + startTime + ',' + endTime + ','+ variable +'}';


                if (flag) {
                    // console.log(flowChart);
                    $.ajax({
                      type: "POST",
                      url: '/solve',
                      data: flowChart,
                      contentType: 'application/json;charset=UTF-8',
                      success: function(response){
                        // console.log(response.series);
                        $('#container').highcharts({
                            credits: {
                                enabled: false
                            },title: {
                                text: 'My OFFL Plot',
                                x: -20 //center
                            },
                            subtitle: {
                                text: 'modeling.mit.edu',
                                x: -20
                            },
                            xAxis: {
                                title: {
                                    text: 'Time'
                                },
                            },
                            yAxis: {
                                title: {
                                    text: 'Species'
                                },
                                plotLines: [{
                                    value: 0,
                                    width: 1,
                                    color: '#808080'
                                }]
                            },
                            tooltip: {
                                valueSuffix: ''
                            },
                            legend: {
                                layout: 'vertical',
                                align: 'right',
                                verticalAlign: 'middle',
                                borderWidth: 0
                            },
                            series: response.series
                        });
                        makeTitleEditable();
                      },//end of success function
                    });
                }
            }

        }
        
        /*
        Updates current connections in the system and stores
        them in connections.
        */
        function updateConnections(connection) {
            if(connection.sourceId === connection.targetId)
                jsPlumb.detach(connection);
            
            connections = [];
            
            var allConnections = jsPlumb.getAllConnections();
            for(c in allConnections)
                connections.push([allConnections[c].sourceId, allConnections[c].targetId]);
        }
        
        /*
        Updates the components in the system by 
        name = id of component
        component = data of component (type, inputs, value)
        remove = false : adding , true : removing 
        */
        function updateComponents(name, component, remove) {
            if (!remove) components[name] = component;
            else delete components[name];
        }
        
        exports.solve = solve;
        exports.on = handler.on;
        exports.updateConnections = updateConnections;
        exports.updateComponents = updateComponents;
        
        return exports;
    }
    
    
    ///////////////////////////////////////
    /////
    /////        CONTROLLER
    /////
    ///////////////////////////////////////
    
    /*
    Connects components in the view to functions and responses
    resulting in change in the model.
    */
    function Controller(model) {
        function solve() {
            model.solve($(this));
        }
        
        function updateConnections(connection) {
            model.updateConnections(connection);
        }
        
        function addComponent(name, component) {
            model.updateComponents(name, component, false);
        }
        
        function removeComponent(name) {
            model.updateComponents(name, [], true);
        }
        
        return {solve: solve, updateConnections: updateConnections, addComponent: addComponent,
                removeComponent: removeComponent};
    }
    
    
    
    ///////////////////////////////////////
    /////
    /////        VIEW
    /////
    ///////////////////////////////////////
    
    /*
    Creates all components in the flowchart
    and connects them to the controller for updating
    */
    function View(div, model, controller) {
        
        //Define all visual containers
        var displayArea = $("<div class='displayArea view wide' style='background-color:white'></div>");
        var componentField = $("<div class='componentField view narrow' style='background-color:white'></div>");
        var trash = $("<div class='trash short narrow'><i class='glyphicon glyphicon-trash'></i></div>");
        var buttonField =  $("<div class='buttonField short wide' style='background-color:white'></div>");
        var space1 = $("<div class='short wider' style='background-image: url(../static/images/back/dark-grungewall.png);border:none;'></div>");
        var space2 = $("<div class='short wider' style='background-image: url(../static/images/back/dark-grungewall.png);border:none;'></div>");
        var space3 = $("<div class='short wider' style='background-image: url(../static/images/back/dark-grungewall.png);border:none;'></div>");
        var inputField =  $("<div class='inputField wider' style='background-color:white;border-bottom:none;'></div>");
        var resultsField =  $("<div class='resultsField wider' style='background-color:white;border-bottom:none;'></div>");

        //Preload machine from DOM if any exist, then clears the DOM
        var preComp = $('.fcComp');
        var preConn = $('.fcConn');
        div.html('');
        
        //Adds all visual containers
        div.append(componentField, displayArea, trash, buttonField, space1, inputField, space2, resultsField, space3);

        //Adds Label and input boxes for time and variable
        var whiteSpaceTop = $("<div class='shortest wider' style='background-color:white;border:none;'></div>");
        var timeTitle = $("<h3>Time and Variable Inputs</h3><br>");
        var initialTime = $("<div class='buttonBox'><label class='timeLabel text-center' id='timeLabel' type='number'>Initial Time</label>   <input id='startTime' type='number' placeholder='e.g. 0' class='timeLabel timeinput-xlarge text-center'></div>");
        var endTime = $("<div class='buttonBox'><label class='timeLabel text-center' id='timeLabel' type='number'>End Time</label>   <input id='endTime' type='number' placeholder='e.g. 10' class='timeLabel timeinput-xlarge text-center' min='1' step='1'></div>");
        var independentVariable = $("<div class='buttonBox'><label class='varLabel text-center' id='varLabel' type='number'>Independent Variable</label>   <input id='variable' type='text' placeholder='e.g. t' class='varLabel timeinput-xlarge text-center'></div>");
        inputField.append(whiteSpaceTop, timeTitle, initialTime, endTime, independentVariable);
        
        // Adds Input title and list for addition input boxes to be added to
        var line1 = $("<br><br><div style='border-bottom: solid 1px gray;height:30px;width:90%;margin:auto;'></div>");
        var inputTitle = $("<br><h3>Initial Conditions</h3>")
        var list = $("<div class='list-append' style='background-color:white;border: none; border-top:none;'><ul class='initial list-group'></ul></div>");
        inputField.append(line1, inputTitle, list);

        //Button for solving the system
        var whiteSpaceBottom = $("<div class='shortest wider' style='background-color:white;border:none;'></div>");
        var line2 = $("<div style='border-bottom: solid 1px gray;height:30px;width:90%;margin:auto;'></div>");
        var solveButton = $('<br><button class="btn solveBtn btn-success" id="#saveButton">Solve this System!</button>');
        solveButton.on('click', controller.solve);
        inputField.append(line2, solveButton, whiteSpaceBottom);

        //Adds Label and highcharts
        var whiteSpaceTopResults = $("<div class='shortest wider' style='background-color:white;border:none;'></div>");
        var resultsTitle = $("<h3>Results</h3><br>");
        var resultChart = $("<div id='container' style='min-width: 310px; height: 400px; margin: 0 auto'></div>");
        var whiteSpaceBottomResults = $("<div class='shortest wider' style='background-color:white;border:none;'></div>");
        resultsField.append(whiteSpaceTopResults, resultsTitle, resultChart, whiteSpaceBottomResults);

        //Buttons for adding components
        var compLabel = $("<h3><strong>Components:</strong></h3>");
        var speciesBtn = $("<button class='buttonz btn' data-type='species' data-toggle='tooltip' title='Species'>\
                         <img src='../static/images/species.png'></button><h4>Species</h4>");
        var interactionBtn  = $("<button class='buttonz btn' data-type='interaction' data-toggle='tooltip' title='Interaction'>\
                         <img src='../static/images/interaction.png'></button><h4>Interaction</h4>");
        
        componentField.append(compLabel, speciesBtn, interactionBtn);
        


        /*
        Create a new component at the position of the clicked component
        button.
        dataType = species | interaction
        dataId = name of the component, dynamically created to be unique
        top, left = position
        value = the value of the gain component
        reversed = what direction the component faces
        */
        var usedIds = ['species','interaction'];
        function createComponent(dataType, dataId, top, left, value, reversed) {
            //Defaults
            if(dataId === undefined)
                dataId = dataType;
            
            //Generates a unique ID
            var nameId = dataId;
            if(usedIds.indexOf(dataId) > -1) {
                var idmaker = 0;
                while(usedIds.indexOf(dataId + idmaker) > -1)
                    idmaker = idmaker + 1;
                nameId = dataId + idmaker;
            }
            usedIds.push(nameId);
            
            //Creates the component
            var newComponent = $("<div class='item "+dataType+"Size' data-type="+dataType+" id='"+nameId+"'>"+
                                 "<img src='../static/images/"+dataType+".png'>"+
                                 "</div>").css({"top": top+displayArea.position().top,
                                                "left": left*displayArea.width()+displayArea.position().left});
            
            var valueBox;
            //Adds input box for species components
            if(dataType === 'species') {
                valueBox = $("<input class='speciesInput' placeholder='Name' type='text' id='"+nameId+"'></input>");
                valueBox.val(value);
                newComponent.append(valueBox);
                valueBox.on('keyup', function (evt) {
                    var updatedValue = valueBox.val();
                    controller.addComponent(nameId, [dataType, parseFloat(updatedValue)]);
                });
                
                //Adds initial input form and keeps name updated
                var initialForm = $("<li class='list-group-item text-center' style='width:32%;' id='"+ nameId + "List'><label style='margin:auto;text-align:center' class='control-label' id='" + nameId + "Label'>Species ' <span id='display"+nameId+"'> </span> '</label> <br> <input style='margin:auto;' id='" + nameId + "Input' type='number' placeholder='Initial Population' min='0' class='input-xlarge'></li>");
                $('.initial').append(initialForm);

                $('#display'+nameId).text(valueBox.val());

                valueBox.keyup(function () {
                    $('#display'+nameId).text(valueBox.val());
                });
            }
            //Adds input box for interaction components
            if(dataType === 'interaction') {
                valueBox = $("<input class='interactionInput' placeholder='func'type='text' id='"+nameId+"'></input>");
                valueBox.val(value);
                newComponent.append(valueBox);
                valueBox.on('keyup', function (evt) {
                    var updatedValue = valueBox.val();
                    controller.addComponent(nameId, [dataType, parseFloat(updatedValue)]);
                });
            }

            //Adds the component, makes it draggable
            displayArea.append(newComponent);
            jsPlumb.draggable($("#"+nameId), {containment: $('.container')});
            controller.addComponent(nameId, [dataType, value]);
            
            //Adds output and input endpoints as appropriate
            var outputEndpoint, inputEndpoint;
                outputEndpoint = jsPlumb.addEndpoint($('#'+nameId), outputEndpointAttrs, genericEndpoint);
                inputEndpoint = jsPlumb.addEndpoint($('#'+nameId), inputEndpointAttrs, genericEndpoint);
            
            /*
            Changes the orientation of the component
            for better visualization of flow in the state machine
            */
            function switchEndpoints() {
                if(inputEndpoint.anchor.x === 0) {
                    inputEndpoint.setAnchor('Right');
                    outputEndpoint.setAnchor('Left');
                    newComponent.attr('data-rev', 'yes');
                }
                else {
                    inputEndpoint.setAnchor('Left');
                    outputEndpoint.setAnchor('Right');
                    newComponent.attr('data-rev', 'no');
                }
                return false;
            }
            
            //If component is created backwards
            if(reversed === 'yes') {
                switchEndpoints();
            }
            
            //Binds reverse function to right click
            newComponent[0].oncontextmenu = function (e) {
                return switchEndpoints();
            };
            
            
            /*
            Keeps the object on the Display area
            Reverts back to it when dragged to other 
            areas
            */
            newComponent.on('dragstop', function (evt) {
                if(evt.pageY > buttonField.position().top)
                    jsPlumb.animate(nameId, {top: buttonField.position().top-newComponent.height()});
                if(evt.pageY < displayArea.position().top)
                    jsPlumb.animate(nameId, {top: displayArea.position().top});
                if(evt.pageX < displayArea.position().left)
                    jsPlumb.animate(nameId, {left: displayArea.position().left});
                if(evt.pageX > displayArea.position().left+displayArea.width())
                    jsPlumb.animate(nameId, {left: displayArea.position().left+displayArea.width()-80});
            });
        }
                
        //PRELOAD MACHINE (IF ANY)
        for(var i=0; i<preComp.length; i++)
            createComponent(preComp.eq(i).attr('data-type'),
                            preComp.eq(i).attr('data-id'),
                            parseFloat(preComp.eq(i).attr('data-top')),
                            parseFloat(preComp.eq(i).attr('data-left')),
                            preComp.eq(i).attr('data-value'),
                            preComp.eq(i).attr('data-rev'));
        
        for(var i=0; i<preConn.length; i++) {
            var fromPoint = jsPlumb.getEndpoints(preConn.eq(i).attr('data-from'))[0];
            var toPoint = jsPlumb.getEndpoints(preConn.eq(i).attr('data-to'))[1];
            controller.updateConnections(jsPlumb.connect({source: fromPoint, target: toPoint}));
        }
        

        ////High Charts

        $(function () {
            $('#container').highcharts({
                credits: {
                    enabled: false
                },title: {
                    text: 'My OFFL Plot',
                    x: -20 //center
                },
                subtitle: {
                    text: 'modeling.mit.edu',
                    x: -20
                },
                xAxis: {
                    title: {
                        text: 'Time'
                    },
                },
                yAxis: {
                    title: {
                        text: 'Species'
                    },
                    plotLines: [{
                        value: 0,
                        width: 1,
                        color: '#808080'
                    }]
                },
                tooltip: {
                    valueSuffix: ''
                },
                legend: {
                    layout: 'vertical',
                    align: 'right',
                    verticalAlign: 'middle',
                    borderWidth: 0
                },
                series: [{
                    name: 'Species 1',
                    data: [7.0, 6.9, 9.5, 14.5, 18.2, 21.5, 25.2, 26.5, 23.3, 18.3, 13.9, 9.6]
                }, {
                    name: 'Species 2',
                    data: [-0.2, 0.8, 5.7, 11.3, 17.0, 22.0, 24.8, 24.1, 20.1, 14.1, 8.6, 2.5]
                }, {
                    name: 'Species 3',
                    data: [-0.9, 0.6, 3.5, 8.4, 13.5, 17.0, 18.6, 17.9, 14.3, 9.0, 3.9, 1.0]
                }, {
                    name: 'Species 4',
                    data: [3.9, 4.2, 5.7, 8.5, 11.9, 15.2, 17.0, 16.6, 14.2, 10.3, 6.6, 4.8]
                }]
            });
            makeTitleEditable();
        });

        //////////OTHER FUNCTIONS

        $('.highcharts-title').css('cursor', 'pointer');
        //////////////////////////////////////////////////
        //////////////////////////////////////////////////
        
        //Clears canvas on click
        $(".clearButton").on("click",function(){
            loadDemo('clear');
        });

        //Create component on click
        $(".buttonz").on("click",function(){
            createComponent($(this).attr('data-type'), undefined, $(this).position().top-displayArea.position().top, 0);
        });
        
        //OR (Chrome only) create them by dragging in
        $('.buttonz').on('mousedown', function() {
            $(this).on('mouseleave',function(e){
                createComponent($(this).attr('data-type'), undefined,
                                e.pageY-displayArea.position().top-15,
                                (e.pageX-displayArea.position().left-40)/displayArea.width(),
                                0);
                $(this).off('mouseleave');
            });
            $(this).on('mouseup', function() {
                $(this).off('mouseleave');
            });
        });
        
        //Delete component when moved to trash
        $('.trash').droppable({
            drop: function(event, ui) {
                    var nameId = $(ui.draggable).attr('id');
                    $('#'+nameId+'Input').remove();
                    $('#'+nameId+'Label').remove();
                    $('#'+nameId+'List').remove();
                    delete usedIds[usedIds.indexOf(ui.draggable[0].id)];
                    jsPlumb.removeAllEndpoints(ui.draggable);
                    controller.removeComponent(ui.draggable[0].id);
                    $(ui.draggable).remove();
            }
        });
        
        //Reposition components when displayArea is resized (width only)
        var prevWinWidth = displayArea.width();
        var prevWinLeft = displayArea.position().left;
        $(window).on('resize', function () {
            var ratio = displayArea.width() / prevWinWidth;
            $('.item').each(function () {
                var previousLeft = parseFloat($(this).css('left'))-prevWinLeft;
                $(this).css({'left':(previousLeft*ratio+displayArea.position().left)});
            });
            jsPlumb.repaintEverything();
            prevWinWidth = displayArea.width();
            prevWinLeft = displayArea.position().left;
        });
        
        //Dynamically update components' current value spans
        function updateSpans() {
            $('.componentValue').each(function () {
                this.innerHTML = Math.round(model.getValue(this.id)*100000)/100000;
            });
        }
    }
    
    
    /*
    Initialises jsPlumb and creates a model, view and 
    controller system for the Flow Chart

    Adds input box for edges
    */
    function setup(div) {
        jsPlumb.ready(function() {
            jsPlumb.bind("connection", function(info) {
                model.updateConnections(info.connection);
                var tempEdgeList = [];
                $("._jsPlumb_overlay").each(function() {
                    var id = $(this).attr('id');
                    tempEdgeList.push(id);
                });
                var pos = tempEdgeList.length - 1;
                edgeInputDict[(tempEdgeList[pos])] = info.connection;
            });
            jsPlumb.bind("connectionDetached", function(info) {
                model.updateConnections(info.connection);

            });
            jsPlumb.importDefaults({
                ConnectionOverlays: [[ "Arrow", { location: 0.7 } ], [ "Custom", { create:function(component) {
                    return $("<input class='edgeInput' type='text' placeholder='insert function' style='color:black;background:none;text-align:center;border:none'>1</input>");}, location: 0.4}]]
            });
        
            var model = Model();
            var controller = Controller(model);
            var view = View(div, model, controller);
        });
    }
    
    return {setup: setup};
})();

$(document).ready(function () {
    $('.flowchart').each(function () {
        flowchart.setup($(this));
    });
});