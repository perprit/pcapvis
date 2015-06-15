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
                $('#graph-view svg').remove()
                $('#graph-minimap svg').remove()
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

    var initialData = setData(extent, extent_initial, binNum, bin);
    var latencyData = setLatency(extent, extent_initial, binNum, bin);
    console.log(latencyData);
    var freq = initialData.freq;
    var ip_list = initialData.ip_list;
    var margin = {top: 20, right: 20, bottom: 30, left: 60};
    var width = $('#graph-view').width()-margin.left-margin.right;
    var height = 450 - margin.top - margin.bottom;
    var xScale = d3.scale.linear().range([0, width-margin.left-margin.right]).domain([extent[0], extent[1]]).clamp(true);
    var xScale_init = d3.scale.linear().range([0, width-margin.left-margin.right]).domain([extent[0], extent[1]]);
    var yScale = d3.scale.linear().range([height, 0]).domain([0, d3.max(freq, function (k){return +k;})]);
    
    var yScale_controlScale = d3.scale.linear().range([height, 0]).domain([0, d3.max(freq, function(k){return +k;})]).clamp(true);
    var yScale_controlAxis = d3.svg.axis().scale(yScale_controlScale).orient('left');
    var yScale_controlBrush = d3.svg.brush().y(yScale_controlScale).extent([0, 0]).on('brushend', yScale_controlBrushend).on('brush', yScale_controlBrush);

    var xAxis = d3.svg.axis().scale(xScale).orient('bottom');
    var yAxis = d3.svg.axis().scale(yScale).orient('left');

    var graph = d3.select('#graph-view').append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g').attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  
    var graph_xAxis = graph.append('g').attr('class', 'x axis').attr("transform", "translate(0," + height + ")").call(xAxis);
    var graph_yAxis = graph.append('g').attr('class', 'y axis').call(yAxis);
    var graph_yControl = graph.append('g').attr('class', 'y axis').attr('transform', 'translate('+width+')').call(yScale_controlAxis);
    var graph_yControlBrush = graph.append('g').attr('transform', 'translate('+width+')').call(yScale_controlBrush);
    graph_yControlBrush.selectAll('.extent,.resize').remove();
    //graph_yControlBrush.selectAll('rect').attr('width', 40) ;
    var graph_yControlSlider = graph_yControlBrush.append('circle').attr('r', 10);
    graph_yControlBrush.call(yScale_controlBrush.extent([0, 0]));
    graph_yControlBrush.selectAll('.resize rect').attr('width', 9).attr('height', 9);
    //.attr('transform', 'translate('+0+','+height/2+')');

    var graph_bars = graph.append('g');
    graph_bars.selectAll('.bar').data(freq).enter().append('rect')
        .attr('class', 'bar')
        .attr('width', width/binNum)
        .attr('height', function(k) { return height - yScale(k); })
	      .attr('transform', function(k, i){return 'translate('+xScale(i*bin) +',' +yScale(k)+')';});

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

    updateFilter(freq);

    // add PCAP data into list
    updateIPList(ip_list);

    // main end

    // calculate sum of datalen for each bin
    function setData(_ext, _extent_initial, _binNum, _bin, _filter_ext){
        var response;
        $.ajax({
            type: 'POST',
            url: '/setData',
            data: JSON.stringify({ext: _ext, extent_initial: _extent_initial, binNum: _binNum, binSize: _bin, filter_ext: _filter_ext}),
            dataType: 'json',
            contentType: 'application/json',
            async: false,
            success: function(data) {
                response = data;
            },
            error: function(jqXHR, textStatus, errorThrown) {
                alert(textStatus + ", " + errorThrown);
            },
            complete: function() {
            }
        });
        return response;
    }

    // calculate latency for each bin
    function setLatency(_ext, _extent_initial, _binNum, _bin, _filter_ext){
        var response;
        $.ajax({
            type: 'POST',
            url: '/setLatency',
            data: JSON.stringify({ext: _ext, extent_initial: _extent_initial, binNum: _binNum, binSize: _bin, filter_ext: _filter_ext}),
            dataType: 'json',
            contentType: 'application/json',
            async: false,
            success: function(data) {
                response = data;
            },
            error: function(jqXHR, textStatus, errorThrown) {
                alert(textStatus + ", " + errorThrown);
            },
            complete: function() {
            }
        });
        return response;
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
        updateGraph();
    }
    function minimap_brushend(){
        updateGraph();
    }

    function updateFilter(data){
        $('#bandwidth-filter #slider').text('');
        $('#bandwidth-filter #slider-textmin').text('');
        $('#bandwidth-filter #slider-textmax').text('');
        $('#bandwidth-filter #slider-type').text('');
        d3.select('#bandwidth-filter #slider-type').text('Bandwidth filter');
        d3.select('#bandwidth-filter #slider')
            .call(d3.slider()
                .axis(true)
                .min(0)
                .max(d3.max(data) - d3.min(data))
                .value([0, d3.max(data) - d3.min(data)])
                .on('slide', function(evt, value){
                    d3.select('#bandwidth-filter #slider-textmin').text(value[0]);
                    d3.select('#bandwidth-filter #slider-textmax').text(value[1]);
                    updateGraph();
                }));
    }

    function updateGraph(){
        var ext = brush_graph.extent();
        if(ext[0] == 0 && ext[1] == 0){
            ext = extent;
        }
        if(Math.ceil((ext[1]-ext[0])/0.05)>400){
            bin = (ext[1]-ext[0])/400;
            binNum = 400;
        }
        else{
            bin=0.05;
            binNum = Math.ceil((ext[1]-ext[0])/0.05);
        }
        var filter_ext = [d3.select('#bandwidth-filter #slider-textmin').text(), d3.select('#bandwidth-filter #slider-textmax').text()]
        var newData = setData(ext, extent_initial, binNum, bin, filter_ext);
        xScale.domain([ext[0], ext[1]]);
        //yScale.domain([0, d3.max(newData.freq, function(k){return +k;})]); 

        var new_graph_bars = graph_bars.selectAll('.bar').data(newData.freq);
         
        new_graph_bars
            .attr('class', 'bar')
            .attr('width', width/binNum)
            .attr('height', function(k){return height-yScale(k);})
            .attr('transform', function(k, i){return 'translate('+xScale(i*bin+ext[0])+','+yScale(k)+')';})
            .style('visibility', 'visible');
       
        new_graph_bars.exit().style('visibility', 'hidden');    
       
        xAxis.scale(xScale);
        //yAxis.scale(yScale);
        graph_xAxis.call(xAxis);
        //graph_yAxis.call(yAxis);

        brush_graph.x(xScale).extent(ext);
        brush_graph_g.call(brush_graph);

        updateIPList(newData.ip_list);
    }
    function yScale_controlBrush(){
      var value = yScale_controlBrush.extent()[0]; 
      if (d3.event.sourceEvent) {
           //value = yScale_controlScale.invert(d3.mouse(this)[0]);
           //yScale_controlBrush.extent([value, value]);
      }
      
      //yScale_controlBrush.extent([value, value]);
      graph_yControlSlider.attr('cy',yScale_controlScale(value));  
    }
    function yScale_controlBrushend(){
      var ext = brush_graph.extent();
      yScale.domain([0, yScale_controlBrush.extent()[0]]); 
      graph_bars.selectAll('.bar')
        .attr('width', width/binNum)
        .attr('height', function(k){return height-yScale(k);})
        .attr('transform', function(k, i){return 'translate('+xScale(i*bin+ext[0])+','+yScale(k)+')';})
        .style('visibility', 'visible')
        .style('fill', function(k){if (yScale(k)<0) return 'red';else return 'steelblue';});
      yAxis.scale(yScale);
      graph_yAxis.call(yAxis);    

    }
}

function updateIPList(data){
    var ip_list = [];
    var obj_src = Object.keys(data);
    obj_src.forEach(function(src){
        var obj_dst = Object.keys(data[src]);
        obj_dst.forEach(function(dst){
            var parsed = {s_ip: [], s_port: 0, d_ip: [], d_port: 0, datalen: 0};
            for(var i=0; i<4; i++) {
                parsed.s_ip.push(src.split(":")[0].split(".")[i]);
                parsed.d_ip.push(dst.split(":")[0].split(".")[i]);
            }
            parsed.s_port = src.split(":")[1];
            parsed.d_port = dst.split(":")[1];
            parsed.datalen = data[src][dst];
            ip_list.push(parsed);
        });
    });
    var s_ip_nest = d3.nest()
        .key(function(d) { return d.s_ip[0]; })
        .key(function(d) { return d.s_ip[1]; })
        .key(function(d) { return d.s_ip[2]; })
        .key(function(d) { return d.s_ip[3]; })
        .entries(ip_list);
    var s_port_nest = d3.nest()
        .key(function(d) { return d.s_port; })
        .entries(ip_list);
    var d_ip_nest = d3.nest()
        .key(function(d) { return d.d_ip[0]; })
        .key(function(d) { return d.d_ip[1]; })
        .key(function(d) { return d.d_ip[2]; })
        .key(function(d) { return d.d_ip[3]; })
        .entries(ip_list);
    var d_port_nest = d3.nest()
        .key(function(d) { return d.d_port; })
        .entries(ip_list);

    ip_list.sort(function(a, b) { return b.datalen - a.datalen });
    var ip_list_view = d3.select("#ip-list");
    ip_list_view.text("");
    ip_list.forEach(function(ip) {
        var ip_entry = ip_list_view.append("li")
            .classed("ip-entry", true)
            .classed("unselectable", true);

        var ip_info = ip_entry.append("span")
            .classed("ip-info", true);

        // src span
        var src_span = ip_info.append("span")
            .classed("src", true);

        var ip_src_a = src_span.append("span").classed("groupable class-a", true);
        ip_src_a.append("span").text(function(){ return ip.s_ip[0]; });
        var ip_src_b = ip_src_a.append("span").classed("groupable class-b", true);
        ip_src_b.append("span").text(function(){ return "."+ip.s_ip[1]; });
        var ip_src_c = ip_src_b.append("span").classed("groupable class-c", true);
        ip_src_c.append("span").text(function(){ return "."+ip.s_ip[2]; });
        var ip_src_d = ip_src_c.append("span").classed("groupable class-d", true);
        ip_src_d.append("span").text(function(){ return "."+ip.s_ip[3]; });

        src_span.append("span")
            .text(function(){ return ":"; });
        src_span.append("span")
            .classed("groupable port", true)
            .text(function(){ return ip.s_port; });

        // right-arrow
        ip_info.append("i")
            .classed("into", true)
            .classed("glyphicon", true)
            .classed("glyphicon-arrow-right", true);

        // dst span
        var dst_span = ip_info.append("span")
            .classed("dst", true);

        var ip_dst_a = dst_span.append("span").classed("groupable class-a", true);
        ip_dst_a.append("span").text(function(){ return ip.d_ip[0]; });
        var ip_dst_b = ip_dst_a.append("span").classed("groupable class-b", true);
        ip_dst_b.append("span").text(function(){ return "."+ip.d_ip[1]; });
        var ip_dst_c = ip_dst_b.append("span").classed("groupable class-c", true);
        ip_dst_c.append("span").text(function(){ return "."+ip.d_ip[2]; });
        var ip_dst_d = ip_dst_c.append("span").classed("groupable class-d", true);
        ip_dst_d.append("span").text(function(){ return "."+ip.d_ip[3]; });

        dst_span.append("span")
            .text(function(){ return ":"; });
        dst_span.append("span")
            .classed("groupable port", true)
            .text(function(){ return ip.d_port; });

        ip_entry.append("span")
            .classed("value", true)
            .text(function(){ return ip.datalen; });
    });


    //var ip_input = $('#ip-input');
    //ip_input.keyup(function() {
        //var input = ip_input[0].value;
        //$("#ip-list > p").each(function() {
            //if($(this).text().search(input) > -1) {
                //$(this).show();
            //} else {
                //$(this).hide();
            //}
        //});
    //});
}
