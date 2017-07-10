(function() {
vis = {}

//===================================================
//---------------------Globals----------------------- 
//===================================================

//Dimensions / Size
var margin, width, height;
var chart,svg;
var x,y;
var datePrinter = d3.time.format("%c");
var TYPES = {
    com: "square",
    pr: "circle",
    commit: "diamond",
    issue: "triangle-up",
  };

//==============end of global declaration===========


vis.init = function(params,data) {
    if (!params) {params = {}}
    if (!data ) {
      alert("JSON file not loaded!")
      return;
    }

    chart = d3.select(params.chart||"#chart"); // placeholder div for svg
    margin = {top: 40, right: 40, bottom: 40, left: 100};
    width  = ( params.width  || 1060 ) - margin.left - margin.right;
    height = ( params.height || 500 ) - margin.top - margin.bottom;

    if (params.user_height){
        height = ( params.user_height * data["devs"].length) - margin.top - margin.bottom;      
    }

    // Clear all 
    chart.selectAll("*").remove();

    chart.selectAll("svg")
    	.data([{width:width,height:height}])
    	.enter()
    	.append("svg");

    // vis.init can be re-ran to pass different height/width values 
    // to the svg. this doesn't create new svg elements. 	  

    svg = d3.select("svg").attr({
    	width: function(d) {return d.width  + margin.left + margin.right},
    	height:function(d) {return d.height + margin.top + margin.bottom}
    })
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.append("rect")
      .style("stroke", "black")
      .style("fill", "#F5F5F5")
      .style("stroke-width", 1)
      .attr("width" , width)
      .attr("height", height);

    // Holds defs like clippath
    var defs = svg.append("defs");
       	defs.append("clipPath")
          .attr("id", "mainclip")
        .append("rect")
          .attr("width", width)
          .attr("height", height);

    // tooltip
    tip = d3.tip().attr('class', 'd3-tip').html(function(d) { return datePrinter(d.date);})
    tip.direction('n');
    tip.offset([-5, 0])
    svg.call(tip)

    // Title
    svg.append("text")
        .attr("x", (width / 2)-10)             
        .attr("y", 0 - (margin.top / 2))
        .attr("text-anchor", "end") 
        .attr("fill", params.user_repo_color)
        .style("font-size", "26px")
        .style("font-weight", "bold")
        .text("User: "+data.user_repo)
        .on("click", function() { window.open("https://github.com/"+data.user_repo); });

    svg.append("text")
        .attr("x", (width / 2)+10)             
        .attr("y", 0 - (margin.top / 2))
        .attr("text-anchor", "start") 
        .attr("fill", params.dep_repo_color)
        .style("font-size", "26px")
        .style("font-weight", "bold")
        .text("Dep: "+data.dep_repo)
        .on("click", function() { window.open("https://github.com/"+data.dep_repo); });


    // ----Make date objects----
    data.interactions.forEach(function(d){ d.date = new Date(d.date);})
    data.dep_date = new Date(data.dep_date);

    // -------------------------
    // Set up scales + axis
    // -------------------------
    var xmin = d3.min([d3.min(data.interactions,function(d){return d.date}),data.dep_date]);
    var xmax = d3.max([d3.max(data.interactions,function(d){return d.date}),data.dep_date]);

    x = d3.time.scale().domain([d3.time.day.offset(xmin, -10), d3.time.day.offset(xmax, 10)]).range([0, width]);
     
     //--------------------
     // To create the Y axis
     // Step 1: add an offset so the entries don't get cut off on the top
     // Step 2: We make 8 bands for each element of dev_nb (2 repos*4types) by appending a 1 or 2 and an s,c,d,t (square, circle, diamond, triangle )
     // Step 3: We then need to hide the "1c" or "2s" etc appended to each username when displaying the title on the Y axix
     // Step 4: Finally we need to hide the lines within each username band and keep the titles
     // --------------------

    // Ordinal scale, hardcoded for now
    // Step 1
    var bands = ["offset"]
    // Step 2 
    data.devs.forEach(function(d){
      bands.push(d+"1s");
      bands.push(d+"1c");
      bands.push(d+"1d");
      bands.push(d+"1t");
      bands.push(d+"2s");
      bands.push(d+"2c");
      bands.push(d+"2d");
      bands.push(d+"2t");
    })
    y = d3.scale.ordinal()
    .domain(bands).rangeBands([0,height]);

    var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom")
      .tickSize(-height);

    var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left")
      .tickSize(-width+1)
      .tickFormat(function (d) {

        // Step 3
        return d.substring(0, d.length - 2);
      });

    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0, "+ height +")")
      .call(xAxis);
   
    svg.append("g")
      .attr("class", "y axis")
      .call(yAxis);

    // Style
    d3.selectAll(".y line")
      .style("stroke-width",4)
      .style("stroke","white")
      // Step 4.1 (Remove even lines)
      .each(function (d, i) {
          if ((i % 8) != 0) {  //Keep every 8 lines
              this.remove();
          }
      });
    d3.selectAll(".y text")
      // Step 4.2 (Remove titles everywhere except for 4th, 12th, 20th, etc)
      .each(function (d, i) {
          if ((i % 4) != 0 || (i % 8) == 0)  {  //odd 
              this.remove();
          }
           
      });
  // ----end make axis-----



  // -------------------------
  // Tools
  // -------------------------

  // Tool to find the correct row for a given interaction datapoint
  var row_finder = function(d){
    var user = d.dev_id;

    if (d.repo === data.user_repo) user +="1"
    else user +="2"

    if      (TYPES[d.type] ==="square")      user += "s";
    else if (TYPES[d.type] ==="circle")      user += "c";
    else if (TYPES[d.type] ==="diamond")     user += "d";
    else if (TYPES[d.type] ==="triangle-up") user += "t";

    return y(user);
  }

  
  // Tool to find the correct URL for a given interaction datapoint
  var url_finder = function(d){
    if (d.type === "issue" || d.type === "pr"){
      window.open("https://github.com/"+d.repo+"/issues/" +d.id,'_blank');
    }
    if (d.type === "commit"){
      window.open("https://github.com/"+d.repo+"/commit/" +d.id,'_blank');
    }
    // Need to make ajax call to github api
    if (d.type === "com"){
      var url = "https://api.github.com/repos/"+d.repo+"/issues/comments/" + d.id
      $.getJSON( url, function( data ) {
        window.open(data.html_url,'_blank');
      });
    }
  }
  //------end tools-----------



  // -------------------------
  // Add datapoints
  // -------------------------
  var dataPoints = svg.append("g")
  		.attr("id", "dataPointsGroup")
  		.attr("clip-path", "url(#mainclip)");

  var shapes = dataPoints.selectAll(".datapoints")
   	.data(data.interactions).enter();
   
   // Append circles
   shapes.append("path")
      .attr("class", "shapes")
      .style("stroke-width", 1.2)
      .style("stroke", "black")
      .attr("transform", function(d) { return "translate(" + x(d.date) + "," + row_finder(d) + ")"; })
      .each(function(d){
        var path = d3.select(this);
        d.ycoord = row_finder(d); // for zoom

        var colour = params.user_repo_color || "green";
        if (d.repo === data.dep_repo) colour = params.dep_repo_color || "blue";
        d.colour = colour; // Save so highlight can return to default colour

        path.attr("d", d3.svg.symbol().type(TYPES[d.type]).size(128))
         .style("fill", d.colour);
        path.classed(d.type);
      })
      .on("mouseover", function(d) { 
          d3.select(this).style("stroke", "red"); 
          d3.select(this).style("stroke-width", 2.5); 
        })
      .on("mouseout",  function(d) { 
          d3.select(this).style("stroke", "black"); 
          d3.select(this).style("stroke-width", 1);
          d3.select(this).style("opacity",.75); 
        })
      .on("mouseover.tooltip", tip.show)
      .on("mouseout.tooltip", tip.hide)
      .on("mousedown", function(d){
        d3.select(this).style("opacity",.50)
      })
      .on("mouseup", function(d){
        d3.select(this).style("opacity",.75)
      })
      .on("dblclick", function(d){
        url_finder(d)
      });

  // -------------------------


  // -------------------------
  // Add red line
  // -------------------------
    data.dep_date = new Date(data.dep_date)

    if(!isNaN(data.dep_date.getTime())){  //Check date is valid

      var line = d3.svg.line()
        .x(function(d) { return x(d.x);})
        .y(function(d) { return d.y;})
        .interpolate("linear");

      var lineData = [[{"x": data.dep_date,"y": 0},{"x": data.dep_date,"y":height}]]

      dataPoints.selectAll(".line")
        .data(lineData)
      .enter().append("path")
        .attr("class", "line")
        .attr("d", line)
        .attr("stroke", params.dep_date_color || "red")
        .style("stroke-dasharray", ("3, 3")) 
        .style("opacity", .75) 
        .attr("stroke-width", 4)
        .on("click", function() { window.open("https://github.com/"+data.user_repo+"/commit/"+data.dep_commit_id,'_blank'); });
    }

  // ------end redline------
      

  // -------------------------
  // Add zoom
  // -------------------------
  var zoom = d3.behavior.zoom()
      .x(x)
      .scaleExtent([1, 100000])
      .on("zoom", zoomed);

  svg.call(zoom)

  function zoomed() {

	  var t = zoom.translate();
	  var s = zoom.scale();

	  //prevent translation/zoom from exceeding bounds
	  tx = Math.min(0, Math.max(width * (1 - s), t[0]));
	  zoom.translate([tx, 0]);

	  // Update Axis
	  svg.select(".x.axis").call(xAxis);
	  // Update points
	  dataPoints.selectAll(".shapes")
       .attr("transform", function(d) { return "translate(" + x(d.date) + "," + d.ycoord + ")"; });

    // Update line
    dataPoints.selectAll('.line').attr("d", line)
	}       
  // ------endzoom----------


}
// -------------------------
})();