/*
*   Save the current  flowchart
*/
function saveFC() {
    //initialize the string
    var htmlString = '';
    
    //Saves each component as a div class fcComp with data attributes type, id, top, left, value, rev (reversed)
    var components = $('.item');
    for(var i=0; i<components.length; i++) {
        var component = components.eq(i);
        if(component[0].id !== 'input' & component[0].id !== 'output') {
            var newString = '<div class="fcComp" data-type="'+
                component.attr('data-type')+'" data-id="'+
                component[0].id+'" data-top="'+
                (component.position().top-$('.displayArea').position().top)+'" data-left="'+
                ((component.position().left-$('.displayArea').position().left)/$('.displayArea').width())+'" data-value="'+
                component.find('input').val()+'" data-rev="'+
                component.attr('data-rev')+'"></div>\n';
            htmlString += newString;
        }
    }
    
    //Saves each connection as a div class fcConn with data attributes from and to
    var connections = jsPlumb.getAllConnections();
    for(c in connections) {
        var connection = connections[c];
        var newString = '<div class="fcConn" data-from="'+
            connection.sourceId+'" data-to="'+
            connection.targetId+'"></div>\n';
        htmlString += newString;
    }
    
    //Initializes the file to be written to, in the form OFFL-name.txt
    var textToWrite = htmlString;
	var textFileAsBlob = new Blob([textToWrite], {type:'text/plain'});
	var fileNameToSaveAs = 'OFFL-'+document.getElementById("fileToSaveAs").value+'.txt';

    //Generates download link for file
	var downloadLink = document.createElement("a");
	downloadLink.download = fileNameToSaveAs;
	downloadLink.innerHTML = "Download File";
	if (window.webkitURL != null)
	{
		// Chrome allows the link to be clicked programmatically.
		downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
		downloadLink.click();
	}
	else
	{
		// Firefox requires the user to actually click the link.
		downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
		downloadLink.onclick = destroyClickedElement;
		document.body.appendChild(downloadLink);
	}
}

function destroyClickedElement(event)
{
	document.body.removeChild(event.target);
}

//Preloaded demos
var demos = {
    'clear': ''
};

/*
*   Loads file from the file input
*/
function loadFC() {
    var fileToLoad = document.getElementById("fileToLoad").files[0];
    if(fileToLoad.type !== 'text/plain')
        alert('Wrong file type! You must upload an OFFL-file_name.txt file in order to use this program.');
    else {
        var fileReader = new FileReader();
        fileReader.onload = function(fileLoadedEvent) 
        {
            var textFromFileLoaded = fileLoadedEvent.target.result;
            loadHTML(textFromFileLoaded);
        };
        fileReader.readAsText(fileToLoad, "UTF-8");
    }
}
//load preloaded demo
function loadDemo(demo) {
    $('.list-group-item').remove();
    loadHTML(demos[demo]);
}

//Initializes the machine according to loaded HTML string
function loadHTML(string) {
    $('.flowchart').each(function () {
        //Cleans up the endpoints
        $('.item').each(function () {
            jsPlumb.removeAllEndpoints($(this));
        });
        //Turns off the resize listener
        $(window).off();
        //Turns off jsPlumb listeners
        jsPlumb.unbind();
        //Starts fresh
        $(this).html(string);
        flowchart.setup($(this));
    });
}

//Saves system as either, ODE, MathML, Mathematica, SQL or LaTeX
function saveFile() {

    var selected_index = $('#sel1').val();
    $('.download').append('<br><div class="remove"><p><strong>Below is your '+selected_index+' file.</strong></p><span id="copytext'+selected_index+'" style="background-color:#D8D8D8"></span></div>');

    $.ajax({
            method: "GET",
            url: '/download',
            data: {'selected_index':selected_index},
            success: function(response){
                $('#copytext'+selected_index+'').append(response.downloadString);
            }
        });
}

function removeDownloads() {
    $('.remove').remove();
}

function openSubmissionModal() {
    $('#saveModal').modal('hide');
    $('#submissionModal').modal('show');
}


function saveToSite() {
    system_name = $("#system_name").val();
    system_description = $("#system_description").val();
    system_tags = []
    $('#currentTags').children().each(function() {
        var tag = $(this).text();
        tag = tag.substring(0,tag.length-2);
        system_tags.push(tag);
    });
    var chart = $("#container").highcharts();
    var system_chart = "data:image/svg+xml," + chart.getSVG();

    var htmlString = '';
    
    //Saves each component as a div class fcComp with data attributes type, id, top, left, value, rev (reversed)
    var components = $('.item');
    for(var i=0; i<components.length; i++) {
        var component = components.eq(i);
        if(component[0].id !== 'input' & component[0].id !== 'output') {
            var newString = '<div class="fcComp" data-type="'+
                component.attr('data-type')+'" data-id="'+
                component[0].id+'" data-top="'+
                (component.position().top-$('.displayArea').position().top)+'" data-left="'+
                ((component.position().left-$('.displayArea').position().left)/$('.displayArea').width())+'" data-value="'+
                component.find('input').val()+'" data-rev="'+
                component.attr('data-rev')+'"></div>\n';
            htmlString += newString;
        }
    }
    
    //Saves each connection as a div class fcConn with data attributes from and to
    var connections = jsPlumb.getAllConnections();
    for(c in connections) {
        var connection = connections[c];
        var newString = '<div class="fcConn" data-from="'+
            connection.sourceId+'" data-to="'+
            connection.targetId+'"></div>\n';
        htmlString += newString;
    }

    var system_page = htmlString;

    system_data = {
            "system_name":system_name,
            "system_description":system_description,
            "system_tags":system_tags,
            "system_chart":JSON.stringify(system_chart),
            "system_page":system_page
        }

    html2canvas($('.displayArea'), {
        onrendered: function(canvas) {
            system_model = canvas.toDataURL();
            system_data["system_model"] = system_model;
            $.ajax({
                type:"POST",
                url:"/save",
                data: system_data,
                success: function(response) {
                    $("#submissionModal").modal('hide');
                    $("#system_name").val("");
                    $("#system_description").val("");
                    $("#system_tags").val("");
                    alert("Your model has been saved!");
                }
            });   
        }
    });   
}

$(document).ready(function() {
    $("#system_tags").keyup(function() {
        var tag = $(this).val()
        if (tag.slice(-1) == ";") {
            $("#currentTags").append("<button type='button' class='btn btn-default' onclick='$(this).remove()'>"+(tag.slice(0,-1))+" &times;</button>  ");
            $(this).val("");
        }
    });

    // $("#testButton").click(function() {
    //     $.fileDownload("http://jqueryfiledownload.apphb.com/FileDownload/DownloadReport/2");
    // });
});

function clearSaveModal() {
    $("#fileToSaveAs").val("");
}