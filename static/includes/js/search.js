var idList = []

$(document).ready(function() {
	$("#searchButton").click(function(){
		var searchTag = $("#searchInput").val();
		var sortBy = $("#sortBy").val();
		var nameChecked = $("#nameMatch").is(':checked');
		var descriptionChecked = $("#descriptionMatch").is(':checked');
		var tagsChecked = $("#tagsMatch").is(':checked');

		$.ajax({
			url: "/search",
			method: "get",
			data: {	"searchTag":searchTag,
					"sortBy":sortBy,
					"nameChecked":nameChecked,
					"descriptionChecked":descriptionChecked,
					"tagsChecked":tagsChecked},
			success: function(response){
						content = "";
						idList = []
						for (r in response.results){
							result=response.results[r]
							idList.push(result.system_id)
							content += '<tr onclick="viewSystem(' + result.system_id + ');'
							content += 'addHit(' + result.system_id + ')">'
							content += '<td>' + result.system_name + '</td>';
							content += '<td>' + result.system_description + '</td>';
							content += '<td>';
							tags = result.system_tags
							for (tag in tags){
								content += tags[tag];
								if(tag != tags.length-1){
									content += ", ";
								}
							}
							content += '</td>';
							content += '<td>' + result.system_date_created + '</td>';
							content += '<td>' + result.system_hits + '</td>';
							content += '</tr>';
						}
						$("#searchResultsTable").empty();
						$("#searchResultsTable").append(content);
						$("#searchResults").modal('show');
					}
		});
	});
});

function viewSystem(system_id) {
	$("#searchResults").modal('hide');
	$.ajax({
		method: "GET",
		url: "/preview",
		data: {"system_id":system_id},
		success: function(response) {
			system = response.system;
			$("#systemPreviewName").text(system.system_name);
			$("#systemPreviewDescription").text(system.system_description);
			$("#systemPreviewTags").text(system.system_tags);
			$.get(system.system_chart_filename, function(data) {
				$("#systemPreviewChart").attr("src",data);
			});
			$.get(system.system_model_filename, function(data) {
				$("#systemPreviewModel").attr("src",data);
			});
			$("#systemPreviewPrev").click(function () {
				currentIndex = idList.indexOf(system_id) 
				if (currentIndex != 0) {
					newIndex = currentIndex - 1;
				}
				else {
					newIndex = currentIndex;
				}
				newID = idList[newIndex]
				// unbind functions from navigation buttons
				$("#systemPreviewPrev").unbind("click");
				$("#systemPreviewNext").unbind("click");
				viewSystem(newID);
			});
			$("#systemPreviewNext").click(function () {
				currentIndex = idList.indexOf(system_id) 
				if (currentIndex != idList.length-1) {
					newIndex = currentIndex + 1;
				}
				else {
					newIndex = currentIndex;
				}
				newID = idList[newIndex]
				// unbind functions from navigation buttons
				$("#systemPreviewPrev").unbind("click");
				$("#systemPreviewNext").unbind("click");
				viewSystem(newID);
			});

			$("#systemPreview").modal('show');
		}
	});
}

function backToSearchResults() {
	$("#systemPreview").modal('hide');
	$("#searchResults").modal('show');
}

function addHit(system_id) {
	$.post("/", {"selectedSystem":system_id})
}