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
    var isLatency = false; //false: freq true: latency
    
    var bin = 0.05;
    var extent_initial = d3.extent(data, function(d){ return d.ts; });
    var extent = [0, extent_initial[1]-extent_initial[0]];
    var binNum = Math.ceil((extent[1] - extent[0])/bin);
    if(binNum>400){
      bin = (extent[1]-extent[0])/400;
      binNum = 400;
    }
    var bin_l = bin;
    var binNum_l = binNum;

    //function setTickFormat(){
      //if(bin<1) return "HH:MM:ss.SSS";
    //}

    drawFilter(data);

    var datalen_minmax = d3.extent(data, function(d){ return d.datalen; });
    var latency_minmax = d3.extent(data, function(d){ return d.latency; });

    var initialData = setData(extent, extent_initial, binNum, bin, datalen_minmax, latency_minmax);
    
    //console.log(initialLatency);
    
    var freq = initialData.freq;
    var ip_list = initialData.b_ip_list;
    
    var latency = initialData.latency;
    var ip_list_l = initialData.l_ip_list;

    var margin = {top: 20, right: 20, bottom: 30, left: 60};
    var width = $('#graph-view').width()-margin.left-margin.right;
    var right_width = 100;
    var height = 450 - margin.top - margin.bottom;
    
    var xScale = d3.scale.linear().range([0, width-margin.left-margin.right-right_width]).domain([extent[0], extent[1]]).clamp(true);
    var xScale_init = d3.scale.linear().range([0, width-margin.left-margin.right-right_width]).domain([extent[0], extent[1]]);
    var yScale = d3.scale.linear().range([height, 0]).domain([0, d3.max(freq, function (k){return +k;})]);
    
    var yScale_controlScale = d3.scale.linear().range([height, 0]).domain([0, d3.max(freq, function(k){return +k;})]).clamp(true);
    var yScale_controlAxis = d3.svg.axis().scale(yScale_controlScale).orient('left');
    var yScale_controlBrush = d3.svg.brush().y(yScale_controlScale).extent([0, 0]).on('brush', yScale_controlBrushfunction);

    var xScale_l = d3.scale.linear().range([0, width-margin.left-margin.right-right_width]).domain([extent[0], extent[1]]).clamp(true);
    var xScale_l_init = d3.scale.linear().range([0, width-margin.left-margin.right-right_width]).domain([extent[0], extent[1]]);
    var yScale_l = d3.scale.linear().range([height, 0]).domain([0, d3.max(latency, function(k){return +k;})]);

    var yScale_controlScale_l = d3.scale.linear().range([height, 0]).domain([0, d3.max(latency, function(k){return +k;})]).clamp(true);
    var yScale_controlAxis_l = d3.svg.axis().scale(yScale_controlScale_l).orient('left');
    var yScale_controlBrush_l = d3.svg.brush().y(yScale_controlScale_l).extent([0, 0]).on('brush', yScale_controlBrushfunction);
    //console.log(moment.unix(extent_initial[0]).format('YYYY/MM/DD HH:mm:ss:SSS'), moment.unix(extent_initial[1]).format('YYYY/MM/DD HH:mm:ss:SSS'));
    var xAxis = d3.svg.axis().scale(xScale).orient('bottom').tickFormat(function(k){
      var t = moment.unix(k+extent_initial[0]);
      if(binNum!=400) return t.format('HH:mm:ss.SSS');
      else return t.format('HH:mm:ss');});
    //console.log(bin*binNum);
    var yAxis = d3.svg.axis().scale(yScale).orient('left');

    var xAxis_l = d3.svg.axis().scale(xScale_l).orient('bottom').tickFormat(function(k){
      var t = moment.unix(k+extent_initial[0]);
      if(binNum!=400) return t.format('HH:mm:ss.SSS');
      else return t.format('HH:mm:ss');
    });
    var yAxis_l = d3.svg.axis().scale(yScale_l).orient('left');

    var graph_svg = d3.select('#graph-view').append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);  
    var graph = graph_svg.append('g').attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  
    var graph_l_svg = d3.select('#graph-view').append('svg')
        .attr('width', width+margin.left+margin.right)
        .attr('height', height + margin.top + margin.bottom);
    var graph_l = graph_l_svg.append('g').attr('transform', 'translate('+margin.left+','+margin.top+')');
        
    var graph_xAxis = graph.append('g').attr('class', 'x axis').attr("transform", "translate(0," + height + ")").call(xAxis);
    var graph_yAxis = graph.append('g').attr('class', 'y axis').call(yAxis);
    var graph_yControl = graph.append('g').attr('class', 'y axis').attr('transform', 'translate('+width+')').call(yScale_controlAxis);
    var graph_yControlBrush = graph.append('g').attr('transform', 'translate('+width+')').call(yScale_controlBrush);
    graph_yControlBrush.selectAll('.extent,.resize').remove();
    
    var graph_yControlSlider = graph_yControlBrush.append('rect').attr('width', 20).attr('height', 10).attr('transform', 'translate(0, -5)');
    graph_yControlBrush.call(yScale_controlBrush.extent([0, 0]));
    graph_yControlBrush.selectAll('.resize rect').attr('width', 20).attr('height', 10).attr('transform', 'translate(0, -5)');


    var graph_xAxis_l = graph_l.append('g').attr('class', 'x axis').attr("transform", "translate(0," + height + ")").call(xAxis_l);
    var graph_yAxis_l = graph_l.append('g').attr('class', 'y axis').call(yAxis_l);
    var graph_yControl_l = graph_l.append('g').attr('class', 'y axis').attr('transform', 'translate('+width+')').call(yScale_controlAxis_l);
    var graph_yControlBrush_l = graph_l.append('g').attr('transform', 'translate('+width+')').call(yScale_controlBrush_l);
    graph_yControlBrush_l.selectAll('.extent,.resize').remove();
     
    var graph_yControlSlider_l = graph_yControlBrush_l.append('rect').attr('width', 20).attr('height', 10).attr('transform', 'translate(0, -5)');
    graph_yControlBrush_l.call(yScale_controlBrush_l.extent([0, 0]));
    graph_yControlBrush_l.selectAll('.resize rect').attr('width', 20).attr('height', 10).attr('transform', 'translate(0, -5)');

    var graph_bars = graph.append('g');
    graph_bars.selectAll('.bar').data(freq).enter().append('rect')
        .attr('class', 'bar')
        .attr('width', (width-right_width)/binNum)
        .attr('height', function(k) { return height - yScale(k); })
	      .attr('transform', function(k, i){return 'translate('+xScale(i*bin) +',' +yScale(k)+')';});

    var minimap_svg = d3.select('#graph-minimap').append('svg')
        .attr('width', width+margin.left+margin.right)
        .attr('height', height/4)
    var minimap= minimap_svg.append('g').attr('transform', 'translate('+margin.left+','+margin.top+')');

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

    var graph_bars_l = graph_l.append('g');
    graph_bars_l.selectAll('.bar').data(latency).enter().append('rect')
        .attr('class', 'bar')
        .attr('width', (width-right_width)/binNum)
        .attr('height', function(k) { return height - yScale_l(k);  })
        .attr('transform', function(k, i){return 'translate('+xScale_l(i*bin_l) +',' +yScale_l(k)+')';});

    var minimap_l_svg = d3.select('#graph-minimap').append('svg')
        .attr('width', width+margin.left+margin.right)
        .attr('height', height/4)
    var minimap_l = minimap_l_svg.append('g').attr('transform', 'translate('+margin.left+','+margin.top+')');

    minimap_l.selectAll(".nothing")
        .data(latency).enter()
        .append('rect')
        .attr('width', width/binNum)
        .attr('height', function(k){return (height-yScale_l(k))/6})
        .attr('transform', function(k, i){return 'translate('+xScale_l(i*bin_l)+','+yScale_l(k)/6+')';});
                                                                                                                  
    var brush_graph_l = d3.svg.brush().x(xScale_l).on('brush', graph_brush).on('brushend',graph_brushend);  
    var brush_graph_g_l = graph_l.append('g').attr('transform', 'translate(0,'+(height)+')');
    brush_graph_g_l.call(brush_graph_l).selectAll('rect').attr('height', 25).style('opacity', 0.3);
     
    var brush_minimap_l = d3.svg.brush().x(xScale_init).on('brush', minimap_brush).on('brushend', minimap_brushend);
    var brush_minimap_g_l = minimap_l.append('g');
    brush_minimap_g_l.call(brush_minimap_l).selectAll('rect').attr('height', height/6).style('opacity', 0.3);

    graph_l_svg.style('display', 'none');
    minimap_l_svg.style('display', 'none');
    updateIPList(ip_list);

    d3.select('#bandwidth-filter #b-slider-type').style('font-weight', '800').text('Bandwidth');
    d3.select('#latency-filter #l-slider-type').style('font-weight', '800').text('Latency');
    d3.select('#bandwidth-filter').style('overflow', 'hidden').style('margin-bottom', '20px');
    d3.select('#latency-filter').style('overflow', 'hidden');
    var filter_b = d3.select('#bandwidth-filter #b-slider').style('margin-bottom', '30px').style('margin-top', '10px');
    var filter_l = d3.select('#latency-filter #l-slider').style('margin-bottom', '30px').style('margin-top', '10px');
    var b_min = d3.select('#bandwidth-filter #b-slider-textmin').style('float', 'left');
    var b_max = d3.select('#bandwidth-filter #b-slider-textmax').style('float', 'right');
    var l_min = d3.select('#latency-filter #l-slider-textmin').style('float', 'left');
    var l_max = d3.select('#latency-filter #l-slider-textmax').style('float', 'right');
    
    $('#toggle-graph label').click(function(){
      var current = $('#toggle-graph label.active').text().trim();
      if(current != 'Bandwidth'){
        isLatency = false;
        graph_l_svg.style('display', 'none');
        minimap_l_svg.style('display', 'none');
        graph_svg.style('display', 'inline');
        minimap_svg.style('display', 'inline');
      }
      else{
        isLatency= true;
        graph_l_svg.style('display', 'inline');
        minimap_l_svg.style('display', 'inline');
        graph_svg.style('display', 'none');
        minimap_svg.style('display', 'none');
      }
    });

  
    // main end
  

    function drawFilter(data){
        $('.filters').css('visibility', 'visible');
        var datalen_minmax = d3.extent(data, function(d){ return d.datalen; });
        var histo_datalen = [];
        var histo_latency = [];
        for(var i=0; i<data.length; i++){
            histo_datalen.push(data[i].datalen);
            histo_latency.push(data[i].latency);
        }
        var latency_minmax = d3.extent(data, function(d){ return d.latency; });
        var b_min = $('#b-slider-textmin');
        b_min.text(datalen_minmax[0].toFixed(3));
        var b_max = $('#b-slider-textmax');
        b_max.text(datalen_minmax[1].toFixed(3));
        var l_min = $('#l-slider-textmin');
        l_min.text(latency_minmax[0].toFixed(3));
        var l_max = $('#l-slider-textmax');
        l_max.text(latency_minmax[1].toFixed(3));
        $('#b-slider').attr('data-range_min', datalen_minmax[0]);
        $('#b-slider').attr('data-range_max', datalen_minmax[1]);
        $('#b-slider').attr('data-cur_min', datalen_minmax[0]);
        $('#b-slider').attr('data-cur_max', datalen_minmax[1]);
        $('#l-slider').attr('data-range_min', latency_minmax[0]);
        $('#l-slider').attr('data-range_max', latency_minmax[1]);
        $('#l-slider').attr('data-cur_min', latency_minmax[0]);
        $('#l-slider').attr('data-cur_max', latency_minmax[1]);

        $('#l-slider').nstSlider({
            "left_grip_selector": "#l_leftGrip",
            "right_grip_selector": "#l_rightGrip",
            "value_bar_selector": "#l_bar",
            "rounding": '0.000001',
            "value_changed_callback": function(cause, leftValue, rightValue) {
                l_min.text(leftValue.toFixed(3));
                l_max.text(rightValue.toFixed(3));                 
            },
            "user_mouseup_callback": function(){
                updateGraph();
            }
        });
        $('#b-slider').nstSlider({
            "left_grip_selector": "#b_leftGrip",
            "right_grip_selector": "#b_rightGrip",
            "value_bar_selector": "#b_bar",
            "rounding": '0.000001',
            "value_changed_callback": function(cause, leftValue, rightValue) {
                b_min.text(leftValue.toFixed(3));
                b_max.text(rightValue.toFixed(3));                 
            },
            "user_mouseup_callback": function(){
                updateGraph();
            }
        });
        $('#b-slider').nstSlider("set_range", datalen_minmax[0], datalen_minmax[1]);
        $('#l-slider').nstSlider("set_range", latency_minmax[0], latency_minmax[1]);
        $('#b-slider').nstSlider("set_position", datalen_minmax[0], datalen_minmax[1]);
        $('#l-slider').nstSlider("set_position", latency_minmax[0], latency_minmax[1]);
        $('#b-slider').nstSlider('set_step_histogram', histo_datalen);
        $('#l-slider').nstSlider('set_step_histogram', histo_latency);
        $('#b-slider').nstSlider('refresh');
        $('#l-slider').nstSlider('refresh');
        console.log(histo_latency);
    }

    // calculate sum of datalen for each bin
    function setData(_ext, _extent_initial, _binNum, _bin, _b_filter_ext, _l_filter_ext){
        var response;
        $.ajax({
            type: 'POST',
            url: '/setData',
            data: JSON.stringify({ext: _ext, extent_initial: _extent_initial, binNum: _binNum, binSize: _bin, b_filter_ext: _b_filter_ext, l_filter_ext: _l_filter_ext}),
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
      if(isLatency){
        brush_minimap_l.extent(brush_graph_l.extent());
        brush_minimap_g_l.call(brush_minimap_l);
      }
      else{
        brush_minimap.extent(brush_graph.extent());
        brush_minimap_g.call(brush_minimap); 
      }
      //updateGraph();
    }

    function graph_brushend(){
      updateGraph();
    } 

    function minimap_brush(){
      if(isLatency){
        brush_graph_l.extent(brush_minimap_l.extent());
        brush_graph_g_l.call(brush_graph_l);
      }
      else{
        brush_graph.extent(brush_minimap.extent());
        brush_graph_g.call(brush_graph);
      }
      updateGraph();
    }
    function minimap_brushend(){
      //  updateGraph();
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
        var b_filter_ext = [d3.select('#bandwidth-filter #b-slider-textmin').text(), d3.select('#bandwidth-filter #b-slider-textmax').text()]
        var l_filter_ext = [d3.select('#latency-filter #l-slider-textmin').text(), d3.select('#latency-filter #l-slider-textmax').text()]
        var newData = setData(ext, extent_initial, binNum_l, bin_l, b_filter_ext, l_filter_ext);
        xScale.domain([ext[0], ext[1]]);
        xScale_l.domain([ext[0], ext[1]]);

        var new_graph_bars = graph_bars.selectAll('.bar').data(newData.freq);
        var new_graph_bars_l = graph_bars_l.selectAll('.bar').data(newData.latency);         
        
        new_graph_bars
            .attr('class', 'bar')
            .attr('width', (width-right_width)/binNum)
            .attr('height', function(k){return height-yScale(k);})
            .attr('transform', function(k, i){return 'translate('+xScale(i*bin+ext[0])+','+yScale(k)+')';})
            .style('visibility', 'visible');

        new_graph_bars_l
            .attr('class', 'bar')
            .attr('width', (width-right_width)/binNum_l)
            .attr('height', function(k){return height-yScale_l(k);})
            .attr('transform', function(k, i){return 'translate('+xScale_l(i*bin_l+ext[0])+','+yScale_l(k)+')';})
            .style('visibility', 'visible');
        
        if(isLatency){
            new_graph_bars.exit().style('visibility', 'hidden');
            updateIPList(newData.l_ip_list);
        }
        else{
            new_graph_bars.exit().style('visibility', 'hidden');
            updateIPList(newData.b_ip_list); 
        }
        xAxis.scale(xScale);
        xAxis_l.scale(xScale_l);
        graph_xAxis.call(xAxis);
        graph_xAxis_l.call(xAxis_l);
        brush_graph.x(xScale).extent(ext);
        brush_graph_l.x(xScale_l).extent(ext);
        brush_graph_g.call(brush_graph);
        brush_graph_g_l.call(brush_graph_l);
    }

    function yScale_controlBrushfunction(){
      if(!isLatency){
        var value = yScale_controlBrush.extent()[0];  
        if(value==0) value=1;
        graph_yControlSlider.attr('y',yScale_controlScale(value));  
        var ext = brush_graph.extent();
        yScale.domain([0, value]).clamp(true); 
        graph_bars.selectAll('.bar')
          .attr('width', (width-right_width)/binNum)
          .attr('height', function(k){return height-yScale(k);})
          .attr('transform', function(k, i){return 'translate('+xScale(i*bin+ext[0])+','+yScale(k)+')';});
        //graph_bars.transition().duration(500)
        //  .style('fill', function(k){if (yScale(k)<0) return 'red';else return 'steelblue';});
        //graph_bars.transition().duration(500)
          //.style('fill', 'steelblue');
        yAxis.scale(yScale);
        graph_yAxis.call(yAxis);      
      }
      else{
        var value = yScale_controlBrush_l.extent()[0];
        if(value==0) value=0.001;
        graph_yControlSlider_l.attr('y',yScale_controlScale_l(value));
        var ext = brush_graph_l.extent();
        yScale_l.domain([0,value]).clamp(true);
        graph_bars_l.selectAll('.bar')
          .attr('width', (width-right_width)/binNum_l)
          .attr('height', function(k){return height-yScale_l(k);})
          .attr('transform', function(k, i){return 'translate('+xScale_l(i*bin_l+ext[0])+','+yScale_l(k)+')';});
         // .style('fill', function(k){if (yScale_l(k)<0) return 'red';else return 'steelblue';});
        yAxis_l.scale(yScale_l);
        graph_yAxis_l.call(yAxis_l); 
      }
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
