var express = require('express');
var cors    = require('cors');
var router  = express.Router();
var utils   = require('../utilities')

var location_provider = location_provider || require('../location_provider');
var location_pvdr_impl = (process.env.LOCATION_PROVIDER_MODE) ? (process.env.LOCATION_PROVIDER_MODE) : "DIRECTORY"

switch (location_pvdr_impl) {
    case "MONGO":
        location_provider.useMongoProvider();
        break;
    case "DIRECTORY":
        location_provider.useDirProvider('data/locations');
        break;
    default:
        console.out("Unknown location provider type: " + location_pvdr_impl + ". Defaulting to DIRECTORY");
        location_provider.useDirProvider('data/locations');
        break;
}

router.use(utils.initElxObject);

router.get('/v1/lugares', cors(), function(req, res, next) {
    if (!utils.sessionCheck(req)) return;

    var user_filter = (req.get('filter'));
    user_filter = (user_filter) ? JSON.parse(user_filter) : null;
    var promise = location_provider.getAll(req.get('include_deleted'), user_filter);
    promise.then(function(location) {
        res.jsonp(location);
    }).catch(function(err){
        next(err);
    });
});

router.get('/v1/lugares/:id', cors(), function(req, res, next) {

    if (!utils.sessionCheck(req)) return;
    var promise = location_provider.getById(req.params.id, req.get('include_deleted'));
    promise.then(function(location) {
        res.jsonp(location);
    }).catch(function(err){
        next(err);
    });
});

router.get('/v1/lugares/creator/:id', cors(), function(req, res, next) {

    if (!utils.sessionCheck(req)) return;
    var promise = location_provider.getByUser(req.params.id, req.get('include_deleted'));
    promise.then(function(location) {
        res.jsonp(location);
    }).catch(function(err){
        next(err);
    });
});

router.put('/v1/lugares/:id', cors(), function(req, res, next) {

    if (!utils.sessionCheck(req)) return;

    var location_data = req.body;
    if (!location_data) {
        req.elx.invalid_argument_name = 'request.body';
        req.elx.invalid_argument_context = "expecting application/json as request body";
        next(new Error('invalid_argument'));
        return;
    }

    if (!location_data.owner) {
        req.elx.invalid_argument_name = 'owner';
        req.elx.invalid_argument_context = "`owner` not found in the location data.  Cannot put location for " + req.params.id;
        next(new Error('invalid_argument'));
        return;
    }

    if (location_data.location_ID != req.params.id) {
        sendWontUpdate(res, req.originalUrl, 'location_ID ('+ location_data.location_ID +') and POST URI (' + req.params.id + ') are inconsistent');
        return;
    }

    if (req.user) {  // this would be populated in the sessionCheck, for now we'l ignore, we should dump if this doesn't match
      if (req.user != location_data.owner) {
        res.status(404).send().end();
        return;
      }
    }

    location_data.location_ID = req.params.id;
    var promise = location_provider.put(location_data);
    promise.then(function() {
        sendCreated(res, req.originalUrl);
    }).catch(function(err){
        next(err);
    });
});

router.delete('/v1/lugares/:id', cors(), function(req, res, next) {

    if (!utils.sessionCheck(req)) return;

    // figure out who is sending the request
    var requesting_user = req.get('user_id');
    if (!requesting_user && req.session) {
        requesting_user = req.session.user_id;
    }
    if (!requesting_user) {
        req.elx.invalid_argument_name = 'user_id';
        req.elx.invalid_argument_context = "`user_id` not found in the headers.  Cannot heartbeat location for " + req.params.id;
        next(new Error('invalid_argument'));
        return;
    }

    var promise = location_provider.delete(req.params.id);
    promise.then(function(location) {
        if (!location) {
            res.status(404).send().end();
        } else  {
            sendJSON(res, { status: "deleted", location: req.originalUrl });
        }
    }).catch(function(err){
        next(err);
    });
});

router.get('/v1/dynamic', cors(), function(req, res, next) {
    if (!utils.sessionCheck(req)) return;

    var language = (req.get('lang'));
    var promise = location_provider.serveDynamicLocation(null, language);
    promise.then(function(location) {
        res.jsonp(location);
    }).catch(function(err){
        next(err);
    });
});

router.get('/v1/dynamic/:id', cors(), function(req, res, next) {
    if (!utils.sessionCheck(req)) return;

    var language = (req.get('lang'));
    var location_id = req.params.id;
    var promise = location_provider.serveDynamicLocation(location_id, language);
    promise.then(function(location) {
        res.jsonp(location);
    }).catch(function(err){
        next(err);
    });
});

router.get('/v1/lugares/tree/:id', cors(), function(req, res, next) {

    if (!utils.sessionCheck(req)) return;


    var promise = null;
    if (req.query.format == "json") {
        promise = renderLocationTreeJSON(req.params.id, res);
    } else {
        promise = renderLocationTreeD3(req.params.id, res);
    }

    promise.catch(function (err) {
        next(err);
    });
});


router.get('/v1/heartbeat/:id', function(req, res, next) {
    if (!utils.sessionCheck(req)) return;

    // figure out who is sending the request
    var requesting_user = req.get('user_id');
    if (!requesting_user && req.session) {
        requesting_user = req.session.user_id;
    }
    if (!requesting_user) {
        req.elx.invalid_argument_name = 'user_id';
        req.elx.invalid_argument_context = "`user_id` not found in the headers.  Cannot heartbeat location for " + req.params.id;
        next(new Error('invalid_argument'));
        return;
    }

    var display_name = requesting_user; // TODO: get the display name from the session object when its available
    var promise = location_provider.heartbeat(req.params.id, requesting_user, display_name);
    promise.then(function() {
        sendJSON(res, { status: "ok", location: req.params.id });
    }).catch(function(err){
        next(err);
    });
});

router.get('/v1/visitors/:id', function(req, res, next) {
    if (!utils.sessionCheck(req)) return;

    var promise = location_provider.getVisitorCount(req.params.id);
    promise.then(function(doc) {
        sendJSON(res, doc);
    }).catch(function(err){
        next(err);
    });
});


// ---- STANDARD routes ---- //
router.get('/v', utils.sendVersion);
router.get('/favicon', utils.sendFavicon);
router.get('*', utils.sendIndex);

function renderLocationTreeJSON(location_id, res) {

    var promise = location_provider.getLocationTree(location_id, false, null);
    return promise.then(function(location) {
        res.jsonp( [ location ] );
    });
};

function renderLocationTreeD3(location_id, res) {

    return new Promise(function(resolve) {
        var html = treeHTML.replace("LOCATION_ID", location_id).replace("LOCATION_ID", location_id);
        resolve(res.send(html));
    });
};


// TODO: Remove this super hacky way of having dynamic html content, replace with d3-node implementation
var treeHTML = `<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <title>Hashplay Location Tree: LOCATION_ID</title>
        <style>
            .node circle {
            fill: #fff;
            stroke: steelblue;
            stroke-width: 3px;
            }
            .node text { font: 12px sans-serif; }
            .link {
            fill: none;
            stroke: #ccc;
            stroke-width: 2px;
            }

            .svg-container {
                display: inline-block;
                position: relative;
                width: 100%;
                padding-bottom: 100%; /* aspect ratio */
                vertical-align: top;
                overflow: hidden;
            }
            .svg-content-responsive {
                display: inline-block;
                position: absolute;
                top: 10px;
                left: 0;
            }
        </style>
    </head>
    <body>
    <!-- load the d3.js library -->
    <script src="http://d3js.org/d3.v3.min.js"></script>
    <script>
    // ************** Generate the tree diagram	 *****************
    var i = 0;

//    var margin = {top: 20, right: 20, bottom: 20, left: 200};
//	    width = window.innerWidth - margin.right - margin.left,
//	    height = window.innerHeight - margin.top - margin.bottom;

    var tree = d3.layout.tree()
        .size([window.innerHeight, window.innerWidth]);

    var diagonal = d3.svg.diagonal()
        .projection(function(d) { return [d.y, d.x]; });

    var svg = d3.select("body")
        .append("div")
            .classed("svg-container", true)
        .append("svg")
//            .attr("preserveAspectRatio", "xMinYMin meet")
            .attr("viewBox", "0 0 " + (window.innerWidth-210) + " " + (window.innerHeight))
            //class to make it responsive
            .classed("svg-content-responsive", true)
            //.attr("viewBox", topMargin + " " + leftMargin + " " + width + " " + height )
            //.attr("preserveAspectRatio", "xMidYMid meet");
//        .attr("width", width + margin.right + margin.left)
//       .attr("height", height + margin.top + margin.bottom)
//        .attr("width", width - (margin.right + margin.left))
//        .attr("height", height - (margin.top + margin.bottom))
      .append("g")
        .attr("transform", "translate(" + 200 + "," + 0 + ")");

    // load the external data
    d3.json("/lug/v1/lugares/tree/LOCATION_ID?format=json", function(error, treeData) {
      root = treeData[0];
      update(root);

//      svg.selectAll(".node")
//          .call(split);
    });


//    window.addEventListener('resize', resize);
//
//    function resize() {
//        javascript
//	    width = window.innerWidth - margin.right - margin.left,
//	    height = window.innerHeight - margin.top - margin.bottom;
//        svg.attr("width", width + margin.right + margin.left)
//           .attr("height", height + margin.top + margin.bottom)
//        force.size([width, height]).resume();
//    }

    function update(source) {

      // Compute the new tree layout.
      var nodes = tree.nodes(root).reverse(),
          links = tree.links(nodes);

      // Normalize for fixed-depth.
      nodes.forEach(function(d) { d.y = d.depth * 180; });

      // Declare the nodes…
      var node = svg.selectAll("g.node")
          .data(nodes, function(d) { return d.id || (d.id = ++i); });

      // Enter the nodes.
      var nodeEnter = node.enter().append("g")
          .attr("class", "node")
          .attr("transform", function(d) {
              return "translate(" + d.y + "," + d.x + ")"; });

      nodeEnter.append("circle")
          .attr("r", 10)
	      .style("stroke", function(d) {
	          if (d.loc_id.indexOf("[cycle]") !== -1) { return "green"; }
	          else if (d.loc_id.indexOf("(not found") !== -1) { return "red"; }
	          else { return "steelblue"; }
	      })
          .style("fill", function(d) {
              if (d.status == "published") { return "#fff"; }
              else return "#ff0";
          });

      nodeEnter.append("text")
          .attr("x", function(d) {
              return d.children || d._children ? -13 : 13; })
          .attr("dy", ".35em")
          .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
          .text(function(d) { return d.name + "~(" + d.loc_id + ")"; })
          .style("fill-opacity", 1)
          .call(split);

      // Declare the links…
      var link = svg.selectAll("path.link")
          .data(links, function(d) { return d.target.id; });

      // Enter the links.
      link.enter().insert("path", "g")
          .attr("class", "link")
          .attr("d", diagonal);
    }

    function split(text) {
        console.log("text: " + text);

        text.each(function () {
        console.log("in fcn for text.each");
            var text = d3.select(this),
                words = text.text().split(/~/).reverse(),
                word,
                line = [],
                lineNumber = 0,
                lineHeight = .7, // ems
                x = text.attr("x"),
                y = text.attr("y"),
                dy = 0, //parseFloat(text.attr("dy")),
                tspan = text.text(null)
                            .append("tspan")
                            .attr("x", x-5)
                            .attr("y", y-10)
                            .attr("dy", dy + "em");
            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));
               // if (tspan.node().getComputedTextLength() > width) {
{
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    tspan = text.append("tspan")
                                .attr("x", x)
                                .attr("y", y)
                                .attr("dy", ++lineNumber * lineHeight + dy + "em")
                                .text(word);
                }
            }
        });
    }
        </script>
    </body>
</html>
`;

module.exports = router;
