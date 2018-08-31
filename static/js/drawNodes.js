//global color varible
const DEFAULT_LINK_COLOR = "#2F4F4F";
const STABLE_LINK_COLOR = "#074DFF";
const STABLE_PORT_COLOR = "#17f413"; //Stable port
const HUB_NODE_COLOR = "#2C3E50"; // HUB
const UNSTABLE_LINK_COLOR_1 = "#FFF13A";
const UNSTABLE_LINK_COLOR_2 = "#FC0000";
const BEACON_NODE_COLOR_LIST = [ // iBeacons
    "#27AE60", // node stable
    "#E67E22", // node unstable lv 1
    "#C0392B", // node unstable lv 2
    "#7F8C8D", // connection lost
    "#8E44AD",
    "#2980B9",
    "#16a085",
    "#F39C12"
];

function initDiagram()
{
    loadModel();
    // create new diagram
    if (window.goSamples) goSamples();  // init for these samples -- you don't need to call this
    var GO = go.GraphObject.make;  //for conciseness in defining node templates

    myDiagram =
    GO(go.Diagram, "myDiagramDiv",  //Diagram refers to its DIV HTML element by id
    {
		"undoManager.isEnabled": true,
		"animationManager.isEnabled": false,
		"clickCreatingTool.archetypeNodeData": { name: "Node" },
		//"allowHorizontalScroll": false,
		"allowVerticalScroll": false,
		"initialContentAlignment": go.Spot.Center,
		"initialAutoScale": go.Diagram.Uniform
	});
    // end of create new diagram

    // when the document is modified, add a "*" to the title and enable the "Save" button
    myDiagram.addDiagramListener("Modified", function(e) {
        var button = document.getElementById("saveButton");
        if (button) button.disabled = !myDiagram.isModified;
        var idx = document.title.indexOf("*");
        if (myDiagram.isModified) {
            if (idx < 0) document.title += "*";
        } else {
            if (idx >= 0) document.title = document.title.substr(0, idx);
        }
    });

    // To simplify this code we define a function for creating a context menu button:
    function makeButton(text, action, visiblePredicate) {
        return GO("ContextMenuButton",
        GO(go.TextBlock, text),
        { click: action },
        // don't bother with binding GraphObject.visible if there's no predicate
        visiblePredicate ? new go.Binding("visible", "", function(o, e) { return o.diagram ? visiblePredicate(o, e) : false; }).ofObject() : {});
    }

    // raised on right click on node
    var nodeMenu =  // context menu for each Node
    GO(go.Adornment, "Vertical",
        makeButton("Send signal",
        function(e, obj) { sendSignal(); }),
        makeButton("Copy",
        function(e, obj) { e.diagram.commandHandler.copySelection(); }),
        makeButton("Delete",
        function(e, obj) { e.diagram.commandHandler.deleteSelection(); }),
        GO(go.Shape, "LineH", { strokeWidth: 2, height: 1, stretch: go.GraphObject.Horizontal }),
        makeButton("Add top port",
        function (e, obj) { addPort("top"); }),
        makeButton("Add left port",
        function (e, obj) { addPort("left"); }),
        makeButton("Add right port",
        function (e, obj) { addPort("right"); }),
        makeButton("Add bottom port",
        function (e, obj) { addPort("bottom"); })
    );

    // size of a port
    var portSize = new go.Size(10, 10);

    // raised on right click on a port
    var portMenu =  // context menu for each port
        GO(go.Adornment, "Vertical",
        makeButton("Swap order",
        function(e, obj) { swapOrder(obj.part.adornedObject); }),
        makeButton("Remove port",
        // in the click event handler, the obj.part is the Adornment;
        // its adornedObject is the port
        function (e, obj) { removePort(obj.part.adornedObject); }),
        makeButton("Change color",
        function(e, obj) { changeColor(obj.part.adornedObject); }),
        makeButton("Remove side ports",
        function (e, obj) { removeAll(obj.part.adornedObject); })
    );

    // the node template
    // includes a panel on each side with an itemArray of panels containing ports
    myDiagram.nodeTemplate =
    GO(go.Node, "Table",
        { locationObjectName: "BODY",
        locationSpot: go.Spot.Center,
        selectionObjectName: "BODY",
        contextMenu: nodeMenu
        },
        new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),

    // the body
    GO(go.Panel, "Auto",
        { row: 1, column: 1, name: "BODY",
        stretch: go.GraphObject.Fill },
        GO(go.Shape, "Rectangle",
            { fill: HUB_NODE_COLOR, stroke: null, strokeWidth: 0,
            minSize: new go.Size(85, 50) }, new go.Binding("fill", "nodeColor")),

        GO(go.TextBlock,
            { margin: 10, textAlign: "center", font: "14px  Segoe UI,sans-serif", stroke: "white", editable: true },
            new go.Binding("text", "name").makeTwoWay()) // bind Textblock.text to data's name
    ),  // end Auto Panel body

        // the Panel holding the left port elements, which are themselves Panels,
        // created for each item in the itemArray, bound to data.leftArray
        GO(go.Panel, "Vertical",
            new go.Binding("itemArray", "leftArray"),
            { row: 1, column: 0,
                itemTemplate:
                GO(go.Panel,
                { _side: "left",  // internal property to make it easier to tell which side it's on
                fromSpot: go.Spot.Left, toSpot: go.Spot.Left,
                fromLinkable: true, toLinkable: true, cursor: "pointer",
                contextMenu: portMenu },
                new go.Binding("portId", "portId"),
                GO(go.Shape, "Rectangle",
                { stroke: null, strokeWidth: 0,
                desiredSize: portSize,
                margin: new go.Margin(1,0) },
                new go.Binding("fill", "portColor"))
                )  // end itemTemplate
            }
        ),  // end Vertical Panel

        // the Panel holding the top port elements, which are themselves Panels,
        // created for each item in the itemArray, bound to data.topArray
        GO(go.Panel, "Horizontal",
            new go.Binding("itemArray", "topArray"),
            { row: 0, column: 1,
                itemTemplate:
                GO(go.Panel,
                    { _side: "top",
                    fromSpot: go.Spot.Top, toSpot: go.Spot.Top,
                    fromLinkable: true, toLinkable: true, cursor: "pointer",
                    contextMenu: portMenu },
                    new go.Binding("portId", "portId"),
                    GO(go.Shape, "Rectangle",
                        { stroke: null, strokeWidth: 0,
                        desiredSize: portSize,
                        margin: new go.Margin(0, 1) },
                        new go.Binding("fill", "portColor"))
                )  // end itemTemplate
            }
        ),  // end Horizontal Panel

        // the Panel holding the right port elements, which are themselves Panels,
        // created for each item in the itemArray, bound to data.rightArray
        GO(go.Panel, "Vertical",
            new go.Binding("itemArray", "rightArray"),
            { row: 1, column: 2,
                itemTemplate:
                GO(go.Panel,
                        { _side: "right",
                        fromSpot: go.Spot.Right, toSpot: go.Spot.Right,
                        fromLinkable: true, toLinkable: true, cursor: "pointer",
                        contextMenu: portMenu },
                        new go.Binding("portId", "portId"),
                    GO(go.Shape, "Rectangle",
                        { stroke: null, strokeWidth: 0,
                        desiredSize: portSize,
                        margin: new go.Margin(1, 0) },
                        new go.Binding("fill", "portColor"))
                )  // end itemTemplate
            }
        ),  // end Vertical Panel

        // the Panel holding the bottom port elements, which are themselves Panels,
        // created for each item in the itemArray, bound to data.bottomArray
        GO(go.Panel, "Horizontal",
            new go.Binding("itemArray", "bottomArray"),
            { row: 2, column: 1,
            itemTemplate:
            GO(go.Panel,
                { _side: "bottom",
                fromSpot: go.Spot.Bottom, toSpot: go.Spot.Bottom,
                fromLinkable: true, toLinkable: true, cursor: "pointer",
                contextMenu: portMenu },
                new go.Binding("portId", "portId"),
                GO(go.Shape, "Rectangle",
                    { stroke: null, strokeWidth: 0,
                    desiredSize: portSize,
                    margin: new go.Margin(0, 1) },
                    new go.Binding("fill", "portColor"))
                )  // end itemTemplate
            }
        )  // end Horizontal Panel
    );  // end Node

    // an orthogonal link template, reshapable and relinkable
    myDiagram.linkTemplate =
    GO(CustomLink,  // defined below
        {
            routing: go.Link.AvoidsNodes,
            corner: 4,
            curve: go.Link.JumpGap,
            reshapable: true,
            resegmentable: false, // can not change link's segment ex) cannot change ㄴ shape to ㄹ shape
            relinkableFrom: false, // can not change links
            relinkableTo: false // can not change links
        },
        new go.Binding("points").makeTwoWay(),
        GO(go.Shape, { stroke: DEFAULT_LINK_COLOR, strokeWidth: 2 },
          new go.Binding("stroke", "strokeColor"))  // to change stroke color of link
    );

    // support double-clicking in the background to add a copy of this data as a node
    myDiagram.toolManager.clickCreatingTool.archetypeNodeData = {
        name: "Unit",
        leftArray: [],
        rightArray: [],
        topArray: [],
        bottomArray: []
    };

    myDiagram.contextMenu =
    GO(go.Adornment, "Vertical",
        makeButton("Paste",
        function(e, obj) { e.diagram.commandHandler.pasteSelection(e.diagram.lastInput.documentPoint); },
        function(o) { return o.diagram.commandHandler.canPasteSelection(); }),
        makeButton("Undo",
        function(e, obj) { e.diagram.commandHandler.undo(); },
        function(o) { return o.diagram.commandHandler.canUndo(); }),
        makeButton("Redo",
        function(e, obj) { e.diagram.commandHandler.redo(); },
        function(o) { return o.diagram.commandHandler.canRedo(); })
    );

    myDiagram.addDiagramListener("ChangedSelection", function(e)
    {
        if(!e.diagram.selection.first())
        {
            $("#infoDraggable").css('visibility', 'hidden');
            return;
        }

        if(e.diagram.selection.first() instanceof go.Node)
            $("#infoDraggable").css('visibility', 'visible');
        else
            $("#infoDraggable").css('visibility', 'hidden');

    });

    $("#infoDraggable").draggable({
        handle: "#infoDraggableHandle"
    });

    $("#infoDraggable").css('visibility', 'hidden');

    var inspector = new Inspector('myInfo', myDiagram,
    {
    properties: {
        // key would be automatically added for nodes, but we want to declare it read-only also:
        "key": { readOnly: true, show: Inspector.showIfPresent },
        "name": { show: Inspector.showIfPresent },
        "leftArray": { show: false },
        "topArray": { show: false },
        "rightArray": { show: false },
        "bottomArray": { show: false },
        "loc": { show: Inspector.showIfPresent },
        "nodeColor": { show: false },
        "timestamplist": { show: false }
        }
    });

	setInterval(requestDiagramData, 1000);
    setInterval(checkNodeStatus, 2000);
    setInterval(changeLinkStatus, 2000);
}


// This custom-routing Link class tries to separate parallel links from each other.
// This assumes that ports are lined up in a row/column on a side of the node.
function CustomLink() {
    go.Link.call(this);
};
go.Diagram.inherit(CustomLink, go.Link);

CustomLink.prototype.findSidePortIndexAndCount = function(node, port) {
    var nodedata = node.data;
    if (nodedata !== null) {
        var portdata = port.data;
        var side = port._side;
        var arr = nodedata[side + "Array"];
        var len = arr.length;
        for (var i = 0; i < len; i++) {
            if (arr[i] === portdata) return [i, len];
        }
    }
    return [-1, len];
};

/** @override */
CustomLink.prototype.computeEndSegmentLength = function(node, port, spot, from) {
    var esl = go.Link.prototype.computeEndSegmentLength.call(this, node, port, spot, from);
    var other = this.getOtherPort(port);
    if (port !== null && other !== null) {
        var thispt = port.getDocumentPoint(this.computeSpot(from));
        var otherpt = other.getDocumentPoint(this.computeSpot(!from));
        if (Math.abs(thispt.x - otherpt.x) > 20 || Math.abs(thispt.y - otherpt.y) > 20) {
            var info = this.findSidePortIndexAndCount(node, port);
            var idx = info[0];
            var count = info[1];
            if (port._side == "top" || port._side == "bottom") {
                if (otherpt.x < thispt.x) {
                    return esl + 4 + idx * 8;
                } else {
                    return esl + (count - idx - 1) * 8;
                }
            } else {  // left or right
                if (otherpt.y < thispt.y) {
                    return esl + 4 + idx * 8;
                } else {
                    return esl + (count - idx - 1) * 8;
                }
            }
        }
    }
    return esl;
};

/** @override */
CustomLink.prototype.hasCurviness = function() {
    if (isNaN(this.curviness)) return true;
    return go.Link.prototype.hasCurviness.call(this);
};

/** @override */
CustomLink.prototype.computeCurviness = function() {
    if (isNaN(this.curviness)) {
        var fromnode = this.fromNode;
        var fromport = this.fromPort;
        var fromspot = this.computeSpot(true);
        var frompt = fromport.getDocumentPoint(fromspot);
        var tonode = this.toNode;
        var toport = this.toPort;
        var tospot = this.computeSpot(false);
        var topt = toport.getDocumentPoint(tospot);
        if (Math.abs(frompt.x - topt.x) > 20 || Math.abs(frompt.y - topt.y) > 20) {
            if ((fromspot.equals(go.Spot.Left) || fromspot.equals(go.Spot.Right)) &&
            (tospot.equals(go.Spot.Left) || tospot.equals(go.Spot.Right))) {
                var fromseglen = this.computeEndSegmentLength(fromnode, fromport, fromspot, true);
                var toseglen = this.computeEndSegmentLength(tonode, toport, tospot, false);
                var c = (fromseglen - toseglen) / 2;
                if (frompt.x + fromseglen >= topt.x - toseglen) {
                    if (frompt.y < topt.y) return c;
                    if (frompt.y > topt.y) return -c;
                }
            } else if ((fromspot.equals(go.Spot.Top) || fromspot.equals(go.Spot.Bottom)) &&
            (tospot.equals(go.Spot.Top) || tospot.equals(go.Spot.Bottom))) {
                var fromseglen = this.computeEndSegmentLength(fromnode, fromport, fromspot, true);
                var toseglen = this.computeEndSegmentLength(tonode, toport, tospot, false);
                var c = (fromseglen - toseglen) / 2;
                if (frompt.x + fromseglen >= topt.x - toseglen) {
                    if (frompt.y < topt.y) return c;
                    if (frompt.y > topt.y) return -c;
                }
            }
        }
    }
    return go.Link.prototype.computeCurviness.call(this);
};
// end CustomLink class

// Add a port to the specified side of the selected nodes.
function addPort(side) {
    myDiagram.startTransaction("addPort");
    myDiagram.selection.each(function(node) {
        // skip any selected Links
        if (!(node instanceof go.Node)) return;
        // compute the next available index number for the side
        var i = 0;
        while (node.findPort(side + i.toString()) !== node) i++;
        // now this new port name is unique within the whole Node because of the side prefix
        var name = side + i.toString();
        // get the Array of port data to be modified
        var arr = node.data[side + "Array"];
        if (arr) {
            // create a new port data object
            var newportdata = {
                portId: name,
                portColor: STABLE_PORT_COLOR
                // if you add port data properties here, you should copy them in copyPortData above
            };
            // and add it to the Array of port data
            myDiagram.model.insertArrayItem(arr, -1, newportdata);
        }
    });
    myDiagram.commitTransaction("addPort");
}

// Exchange the position/order of the given port with the next one.
// If it's the last one, swap with the previous one.
function swapOrder(port) {
    var arr = port.panel.itemArray;
    if (arr.length >= 2) {  // only if there are at least two ports!
        for (var i = 0; i < arr.length; i++) {
            if (arr[i].portId === port.portId) {
                myDiagram.startTransaction("swap ports");
                if (i >= arr.length - 1) i--;  // now can swap I and I+1, even if it's the last port
                var newarr = arr.slice(0);  // copy Array
                newarr[i] = arr[i + 1];  // swap items
                newarr[i + 1] = arr[i];
                // remember the new Array in the model
                myDiagram.model.setDataProperty(port.part.data, port._side + "Array", newarr);
                myDiagram.commitTransaction("swap ports");
                break;
            }
        }
    }
}

// Remove the clicked port from the node.
// Links to the port will be redrawn to the node's shape.
function removePort(port) {
    myDiagram.startTransaction("removePort");
    var pid = port.portId;
    var arr = port.panel.itemArray;
    for (var i = 0; i < arr.length; i++) {
        if (arr[i].portId === pid) {
            myDiagram.model.removeArrayItem(arr, i);
            break;
        }
    }
    myDiagram.commitTransaction("removePort");
}

// Remove all ports from the same side of the node as the clicked port.
function removeAll(port) {
    myDiagram.startTransaction("removePorts");
    var nodedata = port.part.data;
    var side = port._side;  // there are four property names, all ending in "Array"
    myDiagram.model.setDataProperty(nodedata, side + "Array", []);  // an empty Array
    myDiagram.commitTransaction("removePorts");
}

// Change the color of the clicked port.
function changeColor(port) {
    myDiagram.startTransaction("colorPort");
    var data = port.data;
    myDiagram.model.setDataProperty(data, "portColor", go.Brush.randomColor());
    myDiagram.commitTransaction("colorPort");
}

var prevTimestamp = -1;

function requestDiagramData() {
    $.ajax({
        url:'http://165.132.105.118:8080/new_data',
        dataType : "json",
        success: function(point) {
            if(prevTimestamp != point.timestamp) {
                var newKey = -10;
                var newData;
                var nodes = myDiagram.model.nodeDataArray;
                var keyList = [];
                var currentNode = null;
                var hubNode;
                var hubLoc = null;
                for(const [index, node] of nodes.entries()) {
                    keyList.push(node["key"]);
                    if(node["name"] == ("Major " + point.major)) {
                        currentNode = node;
                    }
                    if(node["name"] == "HUB") {
                        hubNode = node;
                    }
                }

                if(currentNode == null) {
                    // when node does not exist
                    // create new node

                    if(nodes.length % 2 == 0) {
                        hubLoc = ((nodes.length / 2) * 150).toString() + " 0";
                    } else if(nodes.length == 1) {
                        hubLoc = "0 0";
                    }
                    while(true) {
                        var existsKey = false;
                        keyList.forEach((key) => {
                            if(newKey == key) {
                                newKey += 1;
                                existsKey = true;
                            }
                        });
                        if(!existsKey) {
                            break;
                        }
                    }
                    newData = {
                        "name": "Major " + point.major,
                        "leftArray": [],
                        "rightArray": [],
                        "topArray": [
                            {
                                "portId": "top0",
                                "portColor": STABLE_PORT_COLOR
                            }
                        ],
                        "nodeColor": BEACON_NODE_COLOR_LIST[0],
                        "bottomArray": [],
                        "key": newKey,
                        "loc": ((nodes.length-1) * 150).toString() + " 200",
                        "major": point.major,
                        "minor": point.minor,
                        "time": point.time,
                        "timestamp": point.timestamp,
                        "timestamplist": [],
                        "avg10receiveperiod": 0,
                        "temp": point.temp,
                        "hum": point.hum,
                        "rssi": point.rssi
					}

                    var newLink = {
                        "from": hubNode["key"],
                        "to": newKey,
                        "fromPort": "bottom"+hubNode["bottomArray"].length.toString(),
                        "toPort": "top0",
                        "strokeColor" : STABLE_LINK_COLOR
					}

                    var newHubPort = {
                        "portId": "bottom"+hubNode["bottomArray"].length.toString(),
                        "portColor": STABLE_PORT_COLOR
                    }

                    myDiagram.startTransaction("addNode");

                    if(hubLoc != null) myDiagram.model.setDataProperty(hubNode, "loc", hubLoc);
                    myDiagram.model.insertArrayItem(hubNode["bottomArray"], -1, newHubPort);
                    myDiagram.model.addNodeData(newData);
                    myDiagram.model.addLinkData(newLink);

                    myDiagram.commitTransaction("addNode");
                } else {
                    // when node already exists
                    // updates current node data

                    var timeDiff = point.timestamp - currentNode["timestamp"];

                    myDiagram.startTransaction("updateNode");

                    myDiagram.model.insertArrayItem(currentNode["timestamplist"], -1, timeDiff);
                    if(currentNode["timestamplist"].length > 10) {
                        myDiagram.model.removeArrayItem(currentNode["timestamplist"], 0);
                    }

                    var sum = 0;
                    var tsList = currentNode["timestamplist"];
                    for(const [index, time] of tsList.entries()) {
                        sum += time;
                    }

                    myDiagram.model.setDataProperty(currentNode, "major", point.major);
                    myDiagram.model.setDataProperty(currentNode, "minor", point.minor);
                    myDiagram.model.setDataProperty(currentNode, "time", point.time);
                    myDiagram.model.setDataProperty(currentNode, "timestamp", point.timestamp);
                    myDiagram.model.setDataProperty(currentNode, "avg10receiveperiod", parseInt(sum / tsList.length));
                    myDiagram.model.setDataProperty(currentNode, "temp", point.temp);
                    myDiagram.model.setDataProperty(currentNode, "hum", point.hum);
                    myDiagram.model.setDataProperty(currentNode, "rssi", point.rssi);

                    myDiagram.commitTransaction("updateNode");
				}

				saveModel();

                prevTimestamp = point.timestamp;
            }
        },
        cache: false,
        error: function(error) {
            console.log(error);
        }
    });
}

function checkNodeStatus() {
    var nodes = myDiagram.model.nodeDataArray;
    if(nodes.length <= 1) {
        return;
    }

    for(const [index, node] of nodes.entries()) {
        if('rssi' in node) {
            myDiagram.startTransaction("updatestatus");
            if(node['rssi'] > -75) {
                myDiagram.model.setDataProperty(node, "nodeColor", BEACON_NODE_COLOR_LIST[0]);
            } else if(node['rssi'] <= -96) {
                myDiagram.model.setDataProperty(node, "nodeColor", BEACON_NODE_COLOR_LIST[2]);

            } else if(-96 < node['rssi'] && node['rssi'] <= -75) {
                myDiagram.model.setDataProperty(node, "nodeColor", BEACON_NODE_COLOR_LIST[1]);
            }
            myDiagram.commitTransaction("updatestatus");
        }
    }

}

function changeLinkStatus() {
    var nodes = myDiagram.model.nodeDataArray;
    var links = myDiagram.model.linkDataArray;
    if(nodes.length <= 1) {
        return;
    }

    for(const [index, node] of nodes.entries()) {

        var link;
        for(const [index, _link] of links.entries()) {
            if(_link['to'] == node['key']) {
                link = _link;
                break;
            }
        }

        myDiagram.startTransaction("updatelinks");
        // connection status
        if('rssi' in node) {
            if(node['rssi'] > -75) {
                myDiagram.model.setDataProperty(link, "strokeColor", STABLE_LINK_COLOR);
            } else if(-100 <= node['rssi'] && node['rssi'] <= -96) {
                myDiagram.model.setDataProperty(link, "strokeColor", UNSTABLE_LINK_COLOR_2);
            } else if(-96 < node['rssi'] && node['rssi'] <= -75) {
                myDiagram.model.setDataProperty(link, "strokeColor", UNSTABLE_LINK_COLOR_1);
            } else {
                myDiagram.model.setDataProperty(link, "strokeColor", CONNECTION_LOST);
            }
        }

        myDiagram.commitTransaction("updatelinks");

        // node status
    }

}

function sendSignal() {
    console.log('check');
}

// When copying a node, we need to copy the data that the node is bound to.
// This JavaScript object includes properties for the node as a whole, and
// four properties that are Arrays holding data for each port.
// Those arrays and port data objects need to be copied too.
// Thus Model.copiesArrays and Model.copiesArrayObjects both need to be true.

// Link data includes the names of the to- and from- ports;
// so the GraphLinksModel needs to set these property names:
// linkFromPortIdProperty and linkToPortIdProperty.

/*
function init(divID)
{
	var GO = go.GraphObject.make;
	myDiagram =
		GO(go.Diagram, divID,
			{
				"undoManager.isEnabled": true,
				"animationManager.isEnabled": false,
		        // allow double-click in background to create a new node
		       	"clickCreatingTool.archetypeNodeData": { text: "Node" },
		       	"allowHorizontalScroll": false,
		       	"allowVerticalScroll": false,
		       	"initialContentAlignment": go.Spot.Center,
		        "initialAutoScale": go.Diagram.Uniform
			});

	// when the document is modified, add a "*" to the title and enable the "Save" button
	myDiagram.addDiagramListener("Modified", function(e)
	{
        var button = document.getElementById("saveButton");
		if(button) button.disabled = !myDiagram.isModified;

        var idx = document.title.indexOf("*");
		if(myDiagram.isModified)
		{
            if(idx < 0) document.title += "*";
		}
		else
		{
            if(idx >= 0) document.title = document.title.substr(0, idx);
        }
    });

	myDiagram.addModelChangedListener(function(e)
	{
		if(e.modelChange !== "nodeDataArray") return;

		generateLinks();
		console.log(myDiagram.model.toJson());
	});

	myDiagram.nodeTemplate =
		GO(go.Node, "Auto",
			{ desiredSize: new go.Size(70, 70) },
			new go.Binding("desiredSize", "size").makeTwoWay(),
			new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
			GO(go.Shape,
				{ figure:"Rectangle", fill: "lightblue" },
				new go.Binding("figure", "fig").makeTwoWay(),
				new go.Binding("fill", "color").makeTwoWay()),
			GO(go.TextBlock,
				{ margin: 5, editable: true  },
				new go.Binding("text").makeTwoWay())
		);

	myDiagram.linkTemplate =
		GO(go.Link,
			{
				routing: go.Link.AvoidsNodes,
				corner: 4,
				curve: go.Link.JumpGap,
				reshapable: true,
			},
	      	GO(go.Shape));

	var nodeDataArray = [];

	var linkDataArray = [];

	myDiagram.model = new go.GraphLinksModel(nodeDataArray, linkDataArray);
}

function generateLinks()
{
    myDiagram.startTransaction("generate links");
	if(myDiagram.nodes.count < 2) return;

	var linkArray = [];
	var nodeList = myDiagram.model.nodeDataArray;

	for(var i = 0; i < nodeList.length; i++)
	{
		if(i != 0) linkArray.push({ from: nodeList[i].key, to: 0 });
	}

	myDiagram.model.linkDataArray = linkArray;
    myDiagram.commitTransaction("generate links");
}
*/
