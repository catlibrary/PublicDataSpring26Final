/*
Alejandra Chavarria
Seattle Housing Affordability After COVID
Choropleth maps: 2017, 2020, 2023
*/

var colorScale = d3.scaleThreshold()
  .domain([1200, 1500, 1800, 2100, 2400])
  .range(d3.schemeOranges[6]);

function drawMap(svgId, selectedYear) {
  var svg = d3.select(svgId),
      width = +svg.attr("width"),
      height = +svg.attr("height");

  svg.selectAll("*").remove();

  var projection = d3.geoIdentity()
    .reflectY(true);

  var path = d3.geoPath()
    .projection(projection);

  d3.json("datasets/RentTypology.geojson").then(function(data) {

    var yearData = {
      type: "FeatureCollection",
      features: data.features.filter(function(d) {
        return +d.properties.YEAR === selectedYear;
      })
    };

    projection.fitExtent(
      [[35, 25], [width - 70, height - 200]],
      yearData
    );

    projection.translate([
      projection.translate()[0] - 45,
      projection.translate()[1]
    ]);

    var mapGroup = svg.append("g");

    var zoom = d3.zoom()
      .scaleExtent([1, 4])
      .on("zoom", function(event) {
        mapGroup.attr("transform", event.transform);
      });

    svg.call(zoom);

    mapGroup.selectAll("path")
      .data(yearData.features)
      .enter()
      .append("path")
      .attr("class", "tract")
      .attr("d", path)
      .attr("fill", function(d) {
        var rent = d.properties.PRICE_NOM;

        if (rent == null || isNaN(rent)) {
          return "#dddddd";
        }

        return colorScale(rent);
      })
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .style("stroke", "black")
          .style("stroke-width", "1.5px")
          .style("opacity", 1);

        d3.select("#rent-map-info")
          .html(
            "<strong>Year:</strong> " + selectedYear + "<br>" +
            "<strong>Census tract:</strong> " + d.properties.TRACT_NAME + "<br>" +
            "<strong>Community area:</strong> " + d.properties.CRA_NAME + "<br>" +
            "<strong>Median rent:</strong> $" + d3.format(",")(d.properties.PRICE_NOM)
          );
      })
      .on("mouseover", function(event, d) {
  d3.select(this)
    .style("stroke", "black")
    .style("stroke-width", "1.5px")
    .style("opacity", 1);

  var infoBox = document.getElementById("rent-map-info");

  infoBox.innerHTML =
    "<strong>Year:</strong> " + selectedYear + "<br>" +
    "<strong>Census tract:</strong> " + d.properties.TRACT_NAME + "<br>" +
    "<strong>Community area:</strong> " + d.properties.CRA_NAME + "<br>" +
    "<strong>Median rent:</strong> $" + d3.format(",")(d.properties.PRICE_NOM);
})

.on("mouseout", function() {
  d3.select(this)
    .style("stroke", "white")
    .style("stroke-width", "0.4px")
    .style("opacity", 0.85);

  var infoBox = document.getElementById("rent-map-info");

  infoBox.innerHTML =
    "Hover over a census tract to see rent information.";
});
  });
}

function drawSharedLegend() {
  var legendColors = d3.schemeOranges[6];

  var legendLabels = [
    "Under $1,200",
    "$1,200–$1,499",
    "$1,500–$1,799",
    "$1,800–$2,099",
    "$2,100–$2,399",
    "$2,400+"
  ];

  var legend = d3.select("#shared-legend");

  legend.selectAll("*").remove();

  legend.append("p")
    .attr("class", "legend-title-html")
    .text("Median rent per unit");

  legend.selectAll(".legend-item")
    .data(legendLabels)
    .enter()
    .append("div")
    .attr("class", "legend-item")
    .html(function(d, i) {
      return "<span style='background:" + legendColors[i] + ";'></span>" + d;
    });
}

drawMap("#map2017", 2017);
drawMap("#map2020", 2020);
drawMap("#map2023", 2023);

drawSharedLegend();