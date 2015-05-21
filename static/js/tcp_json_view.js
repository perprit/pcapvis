$(function() {
    $('#upload-file-btn').click(function() {
        var form_data = new FormData($('#upload-file')[0]);
        $.ajax({
            type: 'POST',
            url: '/upload',
            data: form_data,
            contentType: false,
            cache: false,
            processData: false,
            async: false,
            success: function(data) {
                d = JSON.parse(data);
                drawBarChart(d);
                drawSlider(d);
            },
        });
    });
});

function drawSlider(data){
    var ts = [];
    for(var i=0; i<data.length; i++){
        ts[i] = data[i].ts;
    }
    d3.select('#slider3')
        .call(d3.slider()
        .axis(true)
        .min(d3.min(ts))
        .max(d3.max(ts))
        .value(d3.extent(ts))
        .on("slide", function(evt, value) {
            d3.select('#slider3textmin').text(value[ 0 ]);
            d3.select('#slider3textmax').text(value[ 1 ]);
        }));
}

function drawBarChart(data){
    var bin = 0.1;
    var extent = d3.extent(data, function(d){ return d.ts; });
    var binNum = Math.ceil((extent[1] - extent[0])/bin);
    var freq = [];

    for(var i=0; i<binNum; i++){
        freq[i] = 0;
    }

    data.forEach(function(d){
    var idx = Math.floor((d.ts-extent[0])/bin);
        freq[idx]++;
    })

    var dist = d3.zip(d3.range(0, binNum, 0.1), freq);

    //console.log(dist);

    var margin = {top: 20, right: 20, bottom: 30, left: 40};
    var width = 960 - margin.left - margin.right;
    var height = 500 - margin.top - margin.bottom;

    var x = d3.scale.linear()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom');

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient('left')
        .ticks(10, 'trs');

    $(".graph-view").text('');
    var svg = d3.select('.graph-view').append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    x.domain(d3.extent(dist, function(d) { return d[0]; }));
    y.domain(d3.extent(dist, function(d) { return d[1]; }));

    svg.append('g')
        .attr('class', 'x axis')
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append('g')
        .attr('class', 'y axis')
        .call(yAxis)

    svg.selectAll('.bar')
        .data(dist)
        .enter().append('rect')
        .attr('class', 'bar')
        .attr('x', function(d) { return x(d[0]); })
        .attr('width', function(d) { return width/binNum; })
        .attr('y', function(d) { return y(d[1]); })
        .attr('height', function(d) { return height - y(d[1]); });
}
