$(function() {
    $('#upload-file-btn').click(function() {
        var overlay = $("<div class='overlay'> </div>");
        var spinner = $("<div class='spinner'> </div>");
        overlay.appendTo($("body"));
        spinner.appendTo($("body"));

        var form_data = new FormData($('#upload-file')[0]);
        $.ajax({
            type: 'POST',
            url: '/upload',
            data: form_data,
            contentType: false,
            cache: false,
            processData: false,
            async: true,
            success: function(data) {
                d = JSON.parse(data);
                drawBarChart(d);
            },
            error: function(jqXHR, textStatus, errorThrown) {
                alert(textStatus + ", " + errorThrown);
            },
            complete: function() {
                overlay.remove();
                spinner.remove();
            }
        });
    });
});

function drawBarChart(data){    
    // main
    var bin = 0.05;
    var extent_initial = d3.extent(data, function(d){ return d.ts; });
    var extent = [0, extent_initial[1]-extent_initial[0]];
    var binNum = Math.ceil((extent[1] - extent[0])/bin);
    if(binNum>400){
      bin = (extent[1]-extent[0])/400;
      binNum = 400;
    }

    var initialData = setData(extent);
    var freq = initialData.freq;
    var ip_list = initialData.ip_list;
    var margin = {top: 20, right: 20, bottom: 30, left: 60};
    var width = $('#graph-view').width()-margin.left-margin.right;
    var height = 450 - margin.top - margin.bottom;
    var xScale = d3.scale.linear().range([0, width-margin.left-margin.right]).domain([extent[0], extent[1]]).clamp(true);
    var xScale_init = d3.scale.linear().range([0, width-margin.left-margin.right]).domain([extent[0], extent[1]]);
    var yScale = d3.scale.linear().range([height, 0]).domain([0, d3.max(freq, function (k){return +k;})]);
    
    var xAxis = d3.svg.axis().scale(xScale).orient('bottom');
    var yAxis = d3.svg.axis().scale(yScale).orient('left');

    var graph = d3.select('#graph-view').append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g').attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  
    var graph_xAxis = graph.append('g').attr('class', 'x axis').attr("transform", "translate(0," + height + ")").call(xAxis);
    var graph_yAxis = graph.append('g').attr('class', 'y axis').call(yAxis);
    var graph_bars = graph.append('g');
    graph_bars.selectAll('.bar').data(freq).enter().append('rect')
        .attr('class', 'bar')
        .attr('width', width/binNum)
        .attr('height', function(k) { return height - yScale(k); })
	      .attr('transform', function(k, i){return 'translate('+xScale(i*bin) +',' +yScale(k)+')';});

    console.log(graph_bars);
    var minimap = d3.select('#graph-minimap').append('svg')
        .attr('width', width+margin.left+margin.right)
        .attr('height', height/2)
        .append('g').attr('transform', 'translate('+margin.left+','+margin.top+')');

    minimap.selectAll(".nothing")
        .data(freq).enter()
        .append('rect')
        .attr('width', width/binNum)
        .attr('height', function(k){return (height-yScale(k))/6})
        .attr('transform', function(k, i){return 'translate('+xScale(i*bin)+','+yScale(k)/6+')';});
  
    var brush_graph = d3.svg.brush().x(xScale).on('brush', graph_brush).on('brushend',graph_brushend);  
    var brush_graph_g = graph.append('g').attr('transform', 'translate(0,'+(height)+')');
    brush_graph_g.call(brush_graph).selectAll('rect').attr('height', 25).style('opacity', 0.3);

    var brush_minimap = d3.svg.brush().x(xScale_init).on('brush', minimap_brush).on('brushend', minimap_brushend);
    var brush_minimap_g = minimap.append('g');
    brush_minimap_g.call(brush_minimap).selectAll('rect').attr('height', height/6).style('opacity', 0.3);

    // add PCAP data into list
    updateIPList(ip_list);

    // main end

    // calculate sum of datalen for each bin
    function setData(ext){
      var ret = {freq:[], ip_list:{}};
      for(var i=0;i<binNum;i++) ret.freq[i]=0;
      data.forEach(function(d){
          if(d.ts-extent_initial[0]>ext[1]||d.ts-extent_initial[0]<ext[0]) return;
          console.log("..");
          var idx = Math.floor((d.ts-extent_initial[0]-ext[0])/bin);
          if(idx == binNum) idx--;
          ret.freq[idx]+=d.datalen;
          var src = d.src+':'+d.sport;
          var dst = d.dst+':'+d.dport;
          if(ret.ip_list[src] == undefined) ret.ip_list[src]={};
          if(ret.ip_list[src][dst] == undefined) ret.ip_list[src][dst]=0;
          ret.ip_list[src][dst]+=d.datalen;  
      });
      return ret;
    }

    // brush functions
    function graph_brush(){
        brush_minimap.extent(brush_graph.extent());
        brush_minimap_g.call(brush_minimap);
    }
    function graph_brushend(){
        updateGraph();
    } 
    function minimap_brush(){
        brush_graph.extent(brush_minimap.extent());
        brush_graph_g.call(brush_graph);
    }
    function minimap_brushend(){
        updateGraph();
    } 

    function updateGraph(){
        var ext = brush_graph.extent();
        if(Math.ceil((ext[1]-ext[0])/0.05)>400){
            bin = (ext[1]-ext[0])/400;
            binNum = 400;
        }
        else{
            bin=0.05;
            binNum = Math.ceil((ext[1]-ext[0])/0.05);
        }
        var newData = setData(ext);
        xScale.domain([ext[0], ext[1]]);
        yScale.domain([0, d3.max(newData.freq, function(k){return +k;})]); 

        var new_graph_bars = graph_bars.selectAll('.bar').data(newData.freq);
        
        new_graph_bars
            .attr('class', 'bar')
            .attr('width', width/binNum)
            .attr('height', function(k){return height-yScale(k);})
            .attr('transform', function(k, i){return 'translate('+xScale(i*bin+ext[0])+','+yScale(k)+')';})
            .style('visibility', 'visible');
       

        new_graph_bars.exit().style('visibility', 'hidden');    
        xAxis.scale(xScale);
        yAxis.scale(yScale);
        graph_xAxis.call(xAxis);
        graph_yAxis.call(yAxis);

        brush_graph.x(xScale).extent(ext);
        brush_graph_g.call(brush_graph);

        updateIPList(newData.ip_list);
    }
}

function updateIPList(data){
    var ip_list = [];
    var obj_src = Object.keys(data);
    obj_src.forEach(function(src){
        var obj_dst = Object.keys(data[src]);
        obj_dst.forEach(function(dst){
            ip_list.push({src: src, dst: dst, datalen:data[src][dst]});            
        });
    });
    ip_list.sort(function(a, b) { return b.datalen - a.datalen });

    // TODO refresh whole ip-entry(remove-and-append)
    // wanted to implement this with joins, 
    // but cannot determine constant id for each [src][dst] ~ packet
    var ip_list_view = d3.select("#ip-list");
    ip_list_view.text("");
    ip_list.forEach(function(ip) {
        ip_list_view.append("p")
            .classed("ip-entry", true)
            .classed("unselectable", true)
            .text(function(){ return ip.src+' '+ip.dst+' '+ip.datalen; });
    });


    var ip_input = $('#ip-input');
    ip_input.keyup(function() {
        var input = ip_input[0].value;
        $("#ip-list > p").each(function() {
            if($(this).text().search(input) > -1) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });
        //var ip_entry = d3.select('#ip-list').selectAll('.ip-entry').data(new_ip_list);
        //ip_entry.enter().append("p")
            //.classed("ip-entry", true)
            //.classed("unselectable", true)
            //.text(function(ip){ return ip.src+' '+ip.dst+' '+ip.datalen; });     // TODO
        //ip_entry.exit().remove();
    });
}
