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
            },
        });
    });
});

function drawSlider(data, freq){
    $('#slider3').text('');
    d3.select('#slider3')
        .call(d3.slider()
        .axis(true)
        .min(0)
        .max(d3.max(freq)-d3.min(freq))
        .value([0, d3.max(freq)-d3.min(freq)])
        .on("slide", function(evt, value) {
            updateBarChart(data, value);
            d3.select('#slider3textmin').text(value[ 0 ]);
            d3.select('#slider3textmax').text(value[ 1 ]);
        }));
}

function updateBarChart(data, range){
    //console.log(data);
	  var bin = 0.1;
   	var extent = d3.extent(data, function(d){ return d.ts; });
    var binNum = Math.ceil((extent[1] - extent[0])/bin);
   	var freq = [];

	
    var margin = {top: 20, right: 20, bottom: 30, left: 40};
    var width = 960 - margin.left - margin.right;
    var height = 500 - margin.top - margin.bottom;


    data.forEach(function(d){
    	var idx = Math.floor((d.ts-extent[0])/bin);
      freq[idx] == undefined ? freq[idx] = 1 : freq[idx]++;
    });

    for(var i=0; i<freq.length; i++){
      if(freq[i] < range[0] || freq[i] > range[1]){
    		freq[i] = 0;
      }
    }

    var dist = d3.zip(d3.range(0, binNum, bin), freq);

    var y = d3.scale.linear().range([height, 0]);

    var yAxis = d3.svg.axis().scale(y).orient('left').ticks(10, 'trs');

    y.domain(d3.extent(dist, function(d) { return d[1]; }));

    d3.select('.y.axis')
        .transition()
        .duration(750)
        .call(yAxis);

    var bar = d3.select('svg').selectAll('.bar')
        .data(dist);

    bar.transition().duration(750)
        .attr('y', function(d) { return y(d[1]); })
        .attr('height', function(d) { return height - y(d[1]); });
	
}

function drawBarChart(data){
    var bin = 0.1;
    var extent = d3.extent(data, function(d){ return d.ts; });
    var binNum = Math.ceil((extent[1] - extent[0])/bin);
    var ip_list ={};
    var freq = [];
    for(var i=0;i<binNum;i++) freq[i]=0;

    data.forEach(function(d){
    	  var idx = Math.floor((d.ts-extent[0])/bin);
        freq[idx]+=d.datalen;
        var src = d.src+':'+d.sport;
        var dst = d.dst+':'+d.dport;

        if(ip_list[src] == undefined) ip_list[src]={};
        if(ip_list[src][dst] == undefined) ip_list[src][dst]=0;
        ip_list[src][dst]+=d.datalen;  
    });

    console.log(data);
    console.log(ip_list);

    var dist = d3.zip(d3.range(0, binNum, bin), freq);
    var margin = {top: 20, right: 20, bottom: 30, left: 40};
    var width = 1280 - margin.left - margin.right;
    var height = 500 - margin.top - margin.bottom;

    var x = d3.scale.linear().range([0, width-margin.left-margin.right]).domain(d3.extent(dist, function(d){return d[0];}));
    var y = d3.scale.linear().range([height, 0]).domain(d3.extent(dist, function(d){return d[1];}));

    var xAxis = d3.svg.axis().scale(x).orient('bottom');
    var yAxis = d3.svg.axis().scale(y).orient('left').ticks(10, 'trs');

    $(".graph-view").text('');
    
    var svg = d3.select('.graph-view').append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.append('g').attr('class', 'x axis').attr("transform", "translate(0," + height + ")").call(xAxis);
    svg.append('g').attr('class', 'y axis').call(yAxis);

    svg.selectAll('.bar').data(dist)
        .enter().append('rect')
        .attr('class', 'bar')
        .attr('width', function(d) { return (width-margin.left-margin.right)/binNum; })
        .attr('height', function(d) { return height - y(d[1]); })
	      .attr('transform', function(d){return 'translate('+x(d[0]) +',' +y(d[1])+')';});
    displayIPList(ip_list);
}

function displayIPList(data){
    var obj_src = Object.keys(data);
    obj_src.forEach(function(src){
        var obj_dst = Object.keys(data[src]);
        obj_dst.forEach(function(dst){
            d3.select('.ip-list-view').append("div")
              .text(function(){return src+' '+dst+' '+data[src][dst];});
        });
    });
}
