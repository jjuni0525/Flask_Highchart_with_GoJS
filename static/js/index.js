function saveModel()
{
	$.ajax({
		type: "POST",
		url: "/receiveJSON",
		data: myDiagram.model.toJson(),
		contentType: "application/json; charset=UTF-8",
		dataType: "json",
		success: function () {
			myDiagram.isModified = false;
		},
		error: function () {
			console.log(error);
		}
	});
}

function loadModel()
{
	$.ajax({
		type: "GET",
		url: "/getJSON",
		dataType: "json",
		success: function (data) {
			myDiagram.model = go.Model.fromJson(data);
		}
	});
}

function diagram()
{
    $("#diagramDiv").css('visibility', 'visible');
    if(myDiagram.selection.first() instanceof go.Node)
        $("#infoDraggable").css('visibility', 'visible');
    $("#graphDiv").css('visibility', 'hidden');
    $("#diagramButton").addClass("active");
    $("#graphButton").removeClass("active");
}

function graph()
{
    $("#diagramDiv").css('visibility', 'hidden');
    $("#infoDraggable").css('visibility', 'hidden');
    $("#graphDiv").css('visibility', 'visible');
    $("#diagramButton").removeClass("active");
    $("#graphButton").addClass("active");
}