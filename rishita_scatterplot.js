/*
Rishita Scatterplot(s) Visualization(s)

Original chart design and analysis by Rishita.

Minor modifications were made by Alejandra to integrate the chart into the
group website and ensure compatibility with the other visualizations:

Changes made:
1. Updated the CSV file path to use the shared project datasets folder.
2. Changed the chart container from "#chart" to "#scatterplot" so the chart
   renders inside the website layout.
3. Wrapped the code in a function to avoid conflicts with variables used by
   the choropleth map and line chart.
4. Adjusted a few variable names where needed to prevent overlap with other
   scripts loaded on the same page.
5. No changes were made to the chart's overall design, visual encodings,
   analysis, interpretation, or narrative content.

The visualization logic, COVID-period comparison design, regional grouping,
bubble encoding, and storytelling approach remain Rishita's original work.
*/

function drawScatterplot() {

  const scatterWidth = 760;
  const scatterHeight = 540;
  const scatterMargin = { top: 80, right: 150, bottom: 80, left: 90 };

  const dataFile = "datasets/RentTypology.csv";

  function findColumn(columnMap, candidates) {
    const candidate = candidates
      .map(name => name.trim().toLowerCase())
      .find(name => columnMap[name]);
    return candidate ? columnMap[candidate] : undefined;
  }

  function parseConcernLevel(value) {
    if (value == null) return 0;
    const text = value.toString().trim().toLowerCase();

    if (text.includes("high")) return 3;
    if (text.includes("medium")) return 2;
    if (text.includes("low")) return 1;

    const numeric = parseFloat(text.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(numeric) ? numeric : 0;
  }

  function mapCommunityGroup(area, id) {
    const areaId = Number.isFinite(id) ? id : parseFloat(id);

    if (Number.isFinite(areaId)) {
      if (areaId < 3) return "West Seattle";
      if (areaId < 4) return "South Seattle";
      if (areaId < 5) return "Rainier Valley";
      if (areaId < 6) return "Central Seattle";
      if (areaId < 7) return "Capitol Hill";
      if (areaId < 8) return "University District";
      if (areaId < 10) return "Northgate / Northeast";
      if (areaId < 12) return "Ballard / Fremont";
      if (areaId < 13) return "Queen Anne / Magnolia / Interbay";
      return "Downtown / Core";
    }

    return area || "Seattle";
  }

  function parseRow(d, columnMap) {
    const value = candidates => {
      const col = findColumn(columnMap, candidates);
      return col ? d[col] : undefined;
    };

    const homeFlips = +value(["home_flips", "flips", "flip_count", "num_flips", "number_of_flips", "home_flip_count"]);
    const propertyCount = +value(["properties", "property_count", "num_properties"]);

    const rentPerUnit = +value([
      "tract median apartment contract rent per unit",
      "median_rent",
      "rent",
      "rent_price",
      "average_rent"
    ]);

    const rentIncreaseRaw = +value([
      "year over year change in rent per unit",
      "rent_increase",
      "rent_change",
      "rent_percent_change",
      "rent_pct_change",
      "rent_increase_pct"
    ]);

    const rentIncrease = Math.abs(rentIncreaseRaw) < 1 ? rentIncreaseRaw * 100 : rentIncreaseRaw;

    const rawYear = value(["year"]);
    const year = rawYear != null ? +rawYear : NaN;

    const covid_period = Number.isFinite(year)
      ? year < 2020 ? "Before COVID"
        : year <= 2021 ? "During COVID"
        : "After COVID"
      : "Unknown";

    const communityArea = value([
      "community reporting area name",
      "community reporting area",
      "community area name",
      "community_area",
      "community",
      "reporting_area"
    ]) || "Unknown area";

    const communityAreaId = parseFloat(value([
      "community reporting area id",
      "community reporting area identifier",
      "community reporting area #",
      "community area id",
      "community_reporting_area_id"
    ]));

    const communityGroup = mapCommunityGroup(communityArea, communityAreaId);

    return {
      tract: value(["tract name", "tract label", "neighborhood", "census tract", "tract_name", "neighborhood_name"]) || "Unknown tract",
      community_area: communityArea,
      community_area_group: communityGroup,
      home_flips: Number.isFinite(homeFlips) ? homeFlips : 0,
      property_count: Number.isFinite(propertyCount) ? propertyCount : 0,
      rent_price: Number.isFinite(rentPerUnit) ? rentPerUnit : 0,
      rent_increase: Number.isFinite(rentIncrease) ? rentIncrease : 0,
      concern_level: parseConcernLevel(value(["level of concern", "concern level", "concern_score", "housing_concern", "level_of_concern"])),
      covid_period: covid_period
    };
  }

  d3.csv(dataFile).then(function(rawData) {

    if (!rawData || rawData.length === 0) {
      d3.select("#scatterplot")
        .append("p")
        .attr("class", "error")
        .text("No data found for scatterplot.");
      return;
    }

    const columnMap = rawData.columns.reduce(function(map, c) {
      map[c.trim().toLowerCase()] = c;
      return map;
    }, {});

    const data = rawData.map(function(d) {
      return parseRow(d, columnMap);
    });

    const xField = data.some(d => d.home_flips > 0) ? "home_flips" : "property_count";
    const xLabel = xField === "home_flips"
      ? "Number of Home Flips per Census Tract"
      : "Number of Properties per Census Tract";

    const yField = data.some(d => d.rent_increase !== 0) ? "rent_increase" : "rent_price";
    const yLabel = yField === "rent_increase"
      ? "Rent Increase (Year-over-Year % Change)"
      : "Rent Price ($ per Unit)";

    const xMax = d3.max(data, d => d[xField]) || 1;
    const yMin = d3.min(data, d => d[yField]);
    const yMax = d3.max(data, d => d[yField]) || 1;

    const xScale = d3.scaleLinear()
      .domain([0, xMax * 1.08])
      .range([scatterMargin.left, scatterWidth - scatterMargin.right]);

    const yScale = d3.scaleLinear()
      .domain([yMin != null && !isNaN(yMin) ? yMin * 0.95 : 0, yMax * 1.06])
      .range([scatterHeight - scatterMargin.bottom, scatterMargin.top]);

    const sizeScale = d3.scaleSqrt()
      .domain([
        d3.min(data, d => d.concern_level),
        d3.max(data, d => d.concern_level)
      ])
      .range([5, 24]);

    const colorScale = d3.scaleOrdinal()
      .domain([...new Set(data.map(d => d.community_area_group))])
      .range(d3.schemeTableau10);

    const xAxis = d3.axisBottom(xScale)
      .ticks(8)
      .tickFormat(d3.format("d"));

    const yAxis = d3.axisLeft(yScale)
      .ticks(8)
      .tickFormat(d => yField === "rent_increase" ? `${d3.format(",.1f")(d)}%` : `$${d3.format(",")(d)}`);

    const tooltip = d3.select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

    const periods = ["Before COVID", "During COVID", "After COVID"];

    const periodPanels = periods.map(function(period) {
      return {
        period: period,
        values: data.filter(d => d.covid_period === period)
      };
    });

    function renderPanel(panel) {
      const panelWrapper = d3.select("#scatterplot")
        .append("div")
        .attr("class", "period-chart");

      const panelSvg = panelWrapper.append("svg")
        .attr("width", scatterWidth)
        .attr("height", scatterHeight);

      panelSvg.append("text")
        .attr("class", "chart-title")
        .attr("x", scatterWidth / 2)
        .attr("y", scatterMargin.top / 2)
        .attr("text-anchor", "middle")
        .text(panel.period);

      panelSvg.append("text")
        .attr("class", "chart-subtitle")
        .attr("x", scatterWidth / 2)
        .attr("y", scatterMargin.top / 2 + 22)
        .attr("text-anchor", "middle")
        .text(panel.period + " housing patterns in Seattle");

      panelSvg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0," + (scatterHeight - scatterMargin.bottom) + ")")
        .call(xAxis);

      panelSvg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(" + scatterMargin.left + ",0)")
        .call(yAxis);

      panelSvg.append("text")
        .attr("class", "axis-label")
        .attr("x", scatterWidth / 2)
        .attr("y", scatterHeight - 32)
        .attr("text-anchor", "middle")
        .text(xLabel);

      panelSvg.append("text")
        .attr("class", "axis-label")
        .attr("x", -scatterHeight / 2)
        .attr("y", 26)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .text(yLabel);

      if (panel.values.length === 0) {
        panelSvg.append("text")
          .attr("class", "error")
          .attr("x", scatterWidth / 2)
          .attr("y", scatterHeight / 2)
          .attr("text-anchor", "middle")
          .text("No data available for " + panel.period + ".");
        return;
      }

      panelSvg.selectAll("circle")
        .data(panel.values)
        .join("circle")
        .attr("cx", d => xScale(d[xField]))
        .attr("cy", d => yScale(d[yField]))
        .attr("r", d => sizeScale(d.concern_level))
        .attr("fill", d => colorScale(d.community_area_group))
        .attr("stroke", "#2b3b5b")
        .attr("stroke-width", 1)
        .attr("opacity", 0.88)
        .on("mouseover", function(event, d) {
          d3.select(this).attr("stroke-width", 2).attr("opacity", 1);

          tooltip.transition()
            .duration(120)
            .style("opacity", 1);

          tooltip.html(
              "<strong>" + d.tract + "</strong><br>" +
              "Region: " + d.community_area_group + "<br>" +
              "Area: " + d.community_area + "<br>" +
              xLabel + ": " + d[xField] + "<br>" +
              yLabel + ": " + (yField === "rent_increase" ? d3.format("+.2f")(d[yField]) + "%" : "$" + d3.format(",")(d[yField])) + "<br>" +
              "Concern: " + (d.concern_level >= 1 ? d.concern_level : "N/A") + "<br>" +
              "Period: " + d.covid_period
            )
            .style("left", (event.pageX + 14) + "px")
            .style("top", (event.pageY - 36) + "px");
        })
        .on("mousemove", function(event) {
          tooltip
            .style("left", (event.pageX + 14) + "px")
            .style("top", (event.pageY - 36) + "px");
        })
        .on("mouseout", function() {
          d3.select(this).attr("stroke-width", 1).attr("opacity", 0.88);

          tooltip.transition()
            .duration(120)
            .style("opacity", 0);
        });
    }

    periodPanels.forEach(renderPanel);

    const legendSvg = d3.select("#scatterplot")
      .append("svg")
      .attr("width", scatterWidth)
      .attr("height", 300);

    legendSvg.append("text")
      .attr("class", "legend-title")
      .attr("x", 0)
      .attr("y", 18)
      .text("Seattle Regions (10 groups)");

    const areas = colorScale.domain();

    areas.forEach(function(area, i) {
      const row = legendSvg.append("g")
        .attr("transform", "translate(0," + (36 + i * 24) + ")");

      row.append("rect")
        .attr("x", 0)
        .attr("y", -10)
        .attr("width", 16)
        .attr("height", 16)
        .attr("fill", colorScale(area));

      row.append("text")
        .attr("x", 24)
        .attr("y", 0)
        .attr("alignment-baseline", "middle")
        .text(area);
    });

  }).catch(function(error) {
    console.log("Scatterplot error:", error);

    d3.select("#scatterplot")
      .append("p")
      .attr("class", "error")
      .text("Scatterplot data could not be loaded.");
  });
}

drawScatterplot();