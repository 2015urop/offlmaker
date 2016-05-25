/*

The Flowchart Object
*/
function FC() {
    var exports = {};

    return exports;
}


/*

AN EVENT HANDLER

*/
function UpdateHandler() {
    var handlers = {};
    
    
    /*
    creates a new listener request
    event = event to listen to 
    callback = function to call in the case of the event
    */
    function on(event, callback) {
        var callbacks = handlers[event];
        if (callbacks === undefined) {
            callbacks = [];
        }
        callbacks.push(callback);
        handlers[event] = callbacks;
    }
    
     /*
    calls all functions that are listeners
    event = event that occured
    data = data to pass to the callback functions.
    */
    function trigger(event, data) {
        var callbacks = handlers[event];
        if (callbacks !== undefined) {
            for (var i = 0; i < callbacks.length; i += 1)
                callbacks[i](data);
        }
    }
    
    return {on: on, trigger: trigger};
}

//JSPLUMB DEFINITIONS
 /*
 Defines the various endpoints for out connectors and endpoints.
 Specifies that multiple components can feed into an adder
*/

var genericEndpoint = {
    endpoint:"Dot",
    scope:"blue rectangle",
    connectorStyle : {
        lineWidth:1,
        strokeStyle: "#000",
        joinstyle: 'round'
    },
    connector:[ "Bezier", { curviness:50 } ],	
    dropOptions : {
        tolerance:"touch",
        hoverClass:"dropHover",
        activeClass:"dragActive"
    }
};
var inputEndpointAttrs = {
    anchor: 'Left',
    paintStyle: {width:15, height:15, strokeStyle:"#225588", fillStyle:"transparent", lineWidth:2},
    isTarget: true,
    isSource: false,
    maxConnections: -1
};
var outputEndpointAttrs = {
    anchor: 'Right',
    paintStyle: {width:15, height:15, fillStyle:"#eee"},
    isTarget: false,
    isSource: true,
    maxConnections: -1
};
