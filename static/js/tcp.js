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

    drawFilter(data);

    var datalen_minmax = d3.extent(data, function(d){ return d.datalen; });
    var latency_minmax = d3.extent(data, function(d){ return d.latency; });

    var initialData = setData(extent, extent_initial, binNum, bin, datalen_minmax, latency_minmax);
    

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
    var yScale_controlBrush = d3.svg.brush().y(yScale_controlScale).extent([0, 0]).on('brush', yScale_controlBrushfunction).on('brushend', yScale_controlBrushend);

    var xScale_l = d3.scale.linear().range([0, width-margin.left-margin.right-right_width]).domain([extent[0], extent[1]]).clamp(true);
    var xScale_l_init = d3.scale.linear().range([0, width-margin.left-margin.right-right_width]).domain([extent[0], extent[1]]);
    var yScale_l = d3.scale.linear().range([height, 0]).domain([0, d3.max(latency, function(k){return +k;})]);

    var yScale_controlScale_l = d3.scale.linear().range([height, 0]).domain([0, d3.max(latency, function(k){return +k;})]).clamp(true);
    var yScale_controlAxis_l = d3.svg.axis().scale(yScale_controlScale_l).orient('left');
    var yScale_controlBrush_l = d3.svg.brush().y(yScale_controlScale_l).extent([0, 0]).on('brush', yScale_controlBrushfunction).on('brushend', yScale_controlBrushend);
    
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
    graph_yControlBrush.call(yScale_controlBrush.extent([6000, 6000]));
    graph_yControlBrush.selectAll('.resize rect').attr('width', 20).attr('height', 10).attr('transform', 'translate(0, -5)');
    var graph_yControlReset = graph_yControl.append('rect').attr('width', 20).attr('height', 10)
                                .attr('transform', 'translate(0,'+-15+ ')').style('fill', 'red')
                                .on('click', yScale_resetControlBrush);
                                
    var graph_xAxis_l = graph_l.append('g').attr('class', 'x axis').attr("transform", "translate(0," + height + ")").call(xAxis_l);
    var graph_yAxis_l = graph_l.append('g').attr('class', 'y axis').call(yAxis_l);
    var graph_yControl_l = graph_l.append('g').attr('class', 'y axis').attr('transform', 'translate('+width+')').call(yScale_controlAxis_l);
    var graph_yControlBrush_l = graph_l.append('g').attr('transform', 'translate('+width+')').call(yScale_controlBrush_l);
    graph_yControlBrush_l.selectAll('.extent,.resize').remove();
     
    var graph_yControlSlider_l = graph_yControlBrush_l.append('rect').attr('width', 20).attr('height', 10).attr('transform', 'translate(0, -5)');
    graph_yControlBrush_l.call(yScale_controlBrush_l.extent([0, 0]));
    graph_yControlBrush_l.selectAll('.resize rect').attr('width', 20).attr('height', 10).attr('transform', 'translate(0, -5)');
    var graph_yControlReset_l = graph_yControl_l.append('rect').attr('width', 20).attr('height', 10)
                                .attr('transform', 'translate(0, -15)').style('fill', 'red')
                                .on('click', yScale_resetControlBrush);


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
        $('#ip-list-header .value').text("Traffic(Packet)");
        $('#ip-list-group').text("");
        $('#ip-list-nongroup').text("");
      }
      else{
        isLatency= true;
        graph_l_svg.style('display', 'inline');
        minimap_l_svg.style('display', 'inline');
        graph_svg.style('display', 'none');
        minimap_svg.style('display', 'none');
        $('#ip-list-header .value').text("Latency(Second)");
        $('#ip-list-group').text("");
        $('#ip-list-nongroup').text("");
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
        //updateGraph();
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
        var newext = d3.extent(newData.freq, function(k){return +k;});
        xScale.domain([newext[0], newext[1]]);
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
        yAxis_l.scale(yScale_l);
        graph_yAxis_l.call(yAxis_l); 
      }
    }

    function yScale_resetControlBrush(){
      if(!isLatency){
        var value = yScale_controlScale.domain()[1];
        yScale_controlScale.domain([0, d3.max(freq, function(k){return +k})]).clamp(false);
        graph_yControl.call(yScale_controlAxis);
        graph_yControlSlider.attr('y', yScale_controlScale(value));
        graph_yControlBrush.call(yScale_controlBrush.extent([value, value]));
        graph_yControlBrush.selectAll('.resize rect').attr('width', 20).attr('height', 10).attr('transform', 'translate(0, -5)');
        graph_yControlBrush.selectAll('.extent').attr('height', 10).attr('width', 20).attr('transform', 'translate(0, -5)').style('visibility', 'hidden');

      }
      else{
        yScale_controlScale_l.domain([0, d3.max(latency, function(k){return +k})]).clamp(false);
        graph_yControl_l.call(yScale_controlAxis_l);
        graph_yControlSlider_l.attr('y', 0);
        graph_yControlBrush_l.call(yScale_controlBrush_l.extent([value, value])); 
        graph_yControlBrush_l.selectAll('.resize rect').attr('width', 20).attr('height', 10).attr('transform', 'translate(0, -5)');
        graph_yControlBrush_l.selectAll('.extent').attr('height', 10).attr('width', _l20).attr('transform', 'translate(0, -5)').style('visibility', 'hidden');
      }
    }

    function yScale_controlBrushend(){
      if(!isLatency){
      var value = yScale_controlBrush.extent()[0];
      yScale_controlScale.domain([0, value]);
      graph_yControl.call(yScale_controlAxis); 
      graph_yControlSlider.attr('y', 0);
      graph_yControlBrush.call(yScale_controlBrush.extent([0, 0]));
      }
      else{
      var value = yScale_controlBrush_l.extent()[0];
      yScale_controlScale_l.domain([0, value]);
      graph_yControl_l.call(yScale_controlAxis_l);
      graph_yControlSlider_l.attr('y', 0);
      graph_yControlBrush_l.call(yScale_controlBrush_l.extent([0, 0]));
      }
    }

    function updateIPList(data){
        var ip_list = [];
        // initializing ip_list
        var obj_src = Object.keys(data);
        obj_src.forEach(function(src){
            var obj_dst = Object.keys(data[src]);
            obj_dst.forEach(function(dst){
                var parsed = {src_ip: [], src_port: 0, dst_ip: [], dst_port: 0, datalen: 0};
                for(var i=0; i<4; i++) {
                    parsed.src_ip.push(src.split(":")[0].split(".")[i]);
                    parsed.dst_ip.push(dst.split(":")[0].split(".")[i]);
                }
                parsed.src_port = src.split(":")[1];
                parsed.dst_port = dst.split(":")[1];
                parsed.datalen = data[src][dst];
                ip_list.push(parsed);
            });
        });

        function aggregateIPs(ips, aggregationType) {
            var flat = [];
            switch(aggregationType) {
                case 0:  // src[0~3](===src) - dst[0~3](===dst)
                    var nest = d3.nest()
                        .key(function(d) { return d.src_ip; })
                        .key(function(d) { return d.dst_ip; })
                        .rollup(function(leaves) {
                            return { leaves: leaves, datalen: d3.sum(leaves, function(d) {return d.datalen;})}; })
                        .entries(ips);
                    nest.forEach(function(d) {
                        d.values.forEach(function(v) {
                            flat.push({src_ip: d.key.split(","), dst_ip: v.key.split(","), datalen: v.values.datalen, leaves: v.values.leaves, type: 0});
                        }); 
                    });
                    break;
                case 1:  // src[0] -> *
                    var nest = d3.nest()
                        .key(function(d) { return d.src_ip[0]; })
                        .rollup(function(leaves) {
                            return { leaves: leaves, datalen: d3.sum(leaves, function(d) {return d.datalen;})}; })
                        .entries(ips);
                    nest.forEach(function(d) {
                        flat.push({src_ip: d.key.split(","), dst_ip: [], datalen: d.values.datalen, leaves: d.values.leaves, type: 1});
                    });
                    console.log(flat);
                    break;
                case 2:  // src[0~1] -> *
                    var nest = d3.nest()
                        .key(function(d) { return [d.src_ip[0], d.src_ip[1]].join(","); })
                        .rollup(function(leaves) {
                            return { leaves: leaves, datalen: d3.sum(leaves, function(d) {return d.datalen;})}; })
                        .entries(ips);
                    nest.forEach(function(d) {
                        flat.push({src_ip: d.key.split(","), dst_ip: [], datalen: d.values.datalen, leaves: d.values.leaves, type: 2});
                    });
                    break;
                case 3:  // src[0~2] -> *
                    var nest = d3.nest()
                        .key(function(d) { return [d.src_ip[0], d.src_ip[1], d.src_ip[2]].join(","); })
                        .rollup(function(leaves) {
                            return { leaves: leaves, datalen: d3.sum(leaves, function(d) {return d.datalen;})}; })
                        .entries(ips);
                    nest.forEach(function(d) {
                        flat.push({src_ip: d.key.split(","), dst_ip: [], datalen: d.values.datalen, leaves: d.values.leaves, type: 3});
                    });
                    break;
                case 4:  // src[0~3](===src) -> *
                    var nest = d3.nest()
                        .key(function(d) { return d.src_ip; })
                        .rollup(function(leaves) {
                            return { leaves: leaves, datalen: d3.sum(leaves, function(d) {return d.datalen;})}; })
                        .entries(ips);
                    nest.forEach(function(d) {
                        flat.push({src_ip: d.key.split(","), dst_ip: [], datalen: d.values.datalen, leaves: d.values.leaves, type: 4});
                    });
                    break;
                case 5:  // * -> dst[0]
                    var nest = d3.nest()
                        .key(function(d) { return d.dst_ip[0]; })
                        .rollup(function(leaves) {
                            return { leaves: leaves, datalen: d3.sum(leaves, function(d) {return d.datalen;})}; })
                        .entries(ips);
                    nest.forEach(function(d) {
                        flat.push({src_ip: [], dst_ip: d.key.split(","), datalen: d.values.datalen, leaves: d.values.leaves, type: 5});
                    });
                    break;
                case 6:  // * -> dst[0~1]
                    var nest = d3.nest()
                        .key(function(d) { return [d.dst_ip[0], d.dst_ip[1]].join(","); })
                        .rollup(function(leaves) {
                            return { leaves: leaves, datalen: d3.sum(leaves, function(d) {return d.datalen;})}; })
                        .entries(ips);
                    nest.forEach(function(d) {
                        flat.push({src_ip: [], dst_ip: d.key.split(","), datalen: d.values.datalen, leaves: d.values.leaves, type: 6});
                    });
                    break;
                case 7:  // * -> dst[0~2]
                    var nest = d3.nest()
                        .key(function(d) { return [d.dst_ip[0], d.dst_ip[1], d.dst_ip[2]].join(","); })
                        .rollup(function(leaves) {
                            return { leaves: leaves, datalen: d3.sum(leaves, function(d) {return d.datalen;})}; })
                        .entries(ips);
                    nest.forEach(function(d) {
                        flat.push({src_ip: [], dst_ip: d.key.split(","), datalen: d.values.datalen, leaves: d.values.leaves, type: 7});
                    });
                    break;
                case 8:  // * -> dst[0~3](===dst)
                    var nest = d3.nest()
                        .key(function(d) { return d.dst_ip; })
                        .rollup(function(leaves) {
                            return { leaves: leaves, datalen: d3.sum(leaves, function(d) {return d.datalen;})}; })
                        .entries(ips);
                    nest.forEach(function(d) {
                        flat.push({src_ip: [], dst_ip: d.key.split(","), datalen: d.values.datalen, leaves: d.values.leaves, type: 8});
                    });
                    break;
            }
            return flat;
        };

        function makeGroupable(list, type, d) {
            filtered_ips = list.filter( function(item) {
                var ret = true;
                switch(type) {
                    case 4:
                        ret = ret & (item.src_ip[3] === d.src_ip[3]);
                    case 3:
                        ret = ret & (item.src_ip[2] === d.src_ip[2]);
                    case 2:
                        ret = ret & (item.src_ip[1] === d.src_ip[1]);
                    case 1:
                        ret = ret & (item.src_ip[0] === d.src_ip[0]);
                        break;
                    case 8:
                        ret = ret & (item.dst_ip[3] === d.dst_ip[3]);
                    case 7:
                        ret = ret & (item.dst_ip[2] === d.dst_ip[2]);
                    case 6:
                        ret = ret & (item.dst_ip[1] === d.dst_ip[1]);
                    case 5:
                        ret = ret & (item.dst_ip[0] === d.dst_ip[0]);
                        break;
                }
                return ret;
            });

            list = aggregateIPs(filtered_ips, type)[0];

            var ip_group_entry = ip_list_view_group.append("div")
                .classed("ip-entry", true)
                .classed("unselectable", true)
                .on("mouseenter", function(ip) {
                    d.leaves.forEach(function(d) {
                        // draw send/receive background bar
                    });})
                .on("mouseout", function(ip) {
                    d.leaves.forEach(function(d) {
                        // draw send/receive background bar
                    });})
                .on("click", function() {
                    $(this).remove();
                });

            var ip_info = ip_group_entry.append("span")
                .classed("ip-info", true);
                // src span
                var src_span = ip_info.append("span")
                    .classed("src", true);
                if(type <= 4) {
                    src_span.text(function() {
                        var leaves = list.leaves;
                        var src_ips = [];
                        leaves.forEach(function(item) {
                            if($.inArray(item.src_ip.join("."), src_ips) === -1) {
                                src_ips.push(item.src_ip.join("."));
                            }
                        });
                        return src_ips.join("\n");
                    });
                    //if(type === 1) {
                        //src_span.text(function(){ return list.src_ip[0]; });
                    //} else if(type === 2) {
                        //src_span.text(function(){ return [list.src_ip[0], list.src_ip[1]].join("."); });
                    //} else if(type === 3) {
                        //src_span.text(function(){ return [list.src_ip[0], list.src_ip[1], list.src_ip[2]].join("."); });
                    //} else if(type === 4) {
                        //src_span.text(function(){ return [list.src_ip[0], list.src_ip[1], list.src_ip[2], list.src_ip[3]].join("."); });
                    //}
                } else {
                    src_span.text(function() {
                        var leaves = list.leaves;
                        var src_ips = [];
                        leaves.forEach(function(item) {
                            if($.inArray(item.src_ip.join("."), src_ips) === -1) {
                                src_ips.push(item.src_ip.join("."));
                            }
                        });
                        return src_ips.join("\n");
                    });
                }
                // right-arrow
                ip_info.append("i").classed("into", true).classed("glyphicon", true).classed("glyphicon-arrow-right", true);
                // dst span
                var dst_span = ip_info.append("span")
                    .classed("dst", true);
                if(type <= 4) {
                    dst_span.text(function() {
                        var leaves = list.leaves;
                        var dst_ips = [];
                        leaves.forEach(function(item) {
                            if($.inArray(item.dst_ip.join("."), dst_ips) === -1) {
                                dst_ips.push(item.dst_ip.join("."));
                            }
                        });
                        return dst_ips.join("\n");
                    });
                } else {
                    dst_span.text(function() {
                        var leaves = list.leaves;
                        var dst_ips = [];
                        leaves.forEach(function(item) {
                            if($.inArray(item.dst_ip.join("."), dst_ips) === -1) {
                                dst_ips.push(item.dst_ip.join("."));
                            }
                        });
                        return dst_ips.join("\n");
                    });
                    //if(type === 5) {
                        //dst_span.text(function(){ return list.dst_ip[0]; });
                    //} else if(type === 6) {
                        //dst_span.text(function(){ return [list.dst_ip[0], list.dst_ip[1]].join("."); });
                    //} else if(type === 7) {
                        //dst_span.text(function(){ return [list.dst_ip[0], list.dst_ip[1], list.dst_ip[2]].join("."); });
                    //} else if(type === 8) {
                        //dst_span.text(function(){ return [list.dst_ip[0], list.dst_ip[1], list.dst_ip[2], list.dst_ip[3]].join("."); });
                    //}
                }
                if(!isLatency) {
                    ip_info.append("span")
                        .classed("value", true)
                        .text(function(){ return list.datalen; });
                } else {
                    ip_info.append("span")
                        .classed("value", true)
                        .text(function(){ return list.datalen.toFixed(3); });
                }
        }

        var ip_aggr_nongroup = aggregateIPs(ip_list, 0);
        var ip_aggr_group = [];

        ip_aggr_nongroup.sort(function(a, b) { return d3.descending(a.datalen, b.datalen) });

        var ip_list_view_nongroup = d3.select("#ip-list-nongroup");
        ip_list_view_nongroup.text("");

        var ip_list_view_group = d3.select("#ip-list-group");
        ip_list_view_group.text("");

        var ip_nongroup_entry_selector = ip_list_view_nongroup.selectAll(".ip-entry");
        var ip_nongroup_entry = ip_nongroup_entry_selector.data(ip_aggr_nongroup).enter().append("div")
            .classed("ip-entry", true)
            .classed("unselectable", true)

        ip_nongroup_entry.on("mouseenter", function(ip) {
            ip.leaves.forEach(function(d) {
                console.log(d);
                // draw send/receive background bar
            });});
        ip_nongroup_entry.on("mouseout", function(ip) {
            ip.leaves.forEach(function(d) {
                // draw send/receive background bar
            });});

        var ip_info = ip_nongroup_entry.append("span")
            .classed("ip-info", true);

            // src span
            var src_span = ip_info.append("span")
                .classed("src", true);

            var ip_src_a = src_span.append("span").classed("ip-segment class-a", true);
            ip_src_a.append("span").text(function(d){ return d.src_ip[0]; });
            ip_src_a.on("click", function(d) {
                // type 1
                makeGroupable(ip_aggr_nongroup, 1, d);
            });
            var ip_src_b = src_span.append("span").classed("ip-segment class-b", true);
            ip_src_b.append("span").text(function(d){ return "."+d.src_ip[1]; });
            ip_src_b.on("click", function(d) {
                // type 2
                makeGroupable(ip_aggr_nongroup, 2, d);
            });
            var ip_src_c = src_span.append("span").classed("ip-segment class-c", true);
            ip_src_c.append("span").text(function(d){ return "."+d.src_ip[2]; });
            ip_src_c.on("click", function(d) {
                // type 3
                makeGroupable(ip_aggr_nongroup, 3, d);
            });
            var ip_src_d = src_span.append("span").classed("ip-segment class-d", true);
            ip_src_d.append("span").text(function(d){ return "."+d.src_ip[3]; });
            ip_src_d.on("click", function(d) {
                // type 4
                makeGroupable(ip_aggr_nongroup, 4, d);
            });

            // right-arrow
            ip_info.append("i").classed("into", true).classed("glyphicon", true).classed("glyphicon-arrow-right", true);

            // dst span
            var dst_span = ip_info.append("span")
                .classed("dst", true);

            var ip_dst_a = dst_span.append("span").classed("ip-segment class-a", true);
            ip_dst_a.append("span").text(function(d){ return d.dst_ip[0]; });
            ip_dst_a.on("click", function(d) {
                // type 5
                makeGroupable(ip_aggr_nongroup, 5, d);
            });
            var ip_dst_b = dst_span.append("span").classed("ip-segment class-b", true);
            ip_dst_b.append("span").text(function(d){ return "."+d.dst_ip[1]; });
            ip_dst_b.on("click", function(d) {
                // type 6
                makeGroupable(ip_aggr_nongroup, 6, d);
            });
            var ip_dst_c = dst_span.append("span").classed("ip-segment class-c", true);
            ip_dst_c.append("span").text(function(d){ return "."+d.dst_ip[2]; });
            ip_dst_c.on("click", function(d) {
                // type 7
                makeGroupable(ip_aggr_nongroup, 7, d);
            });
            var ip_dst_d = dst_span.append("span").classed("ip-segment class-d", true);
            ip_dst_d.append("span").text(function(d){ return "."+d.dst_ip[3]; });
            ip_dst_d.on("click", function(d) {
                // type 8
                makeGroupable(ip_aggr_nongroup, 8, d);
            });

            if(!isLatency) {
                ip_info.append("span")
                    .classed("value", true)
                    .text(function(d){ return d.datalen; });
            } else {
                ip_info.append("span")
                    .classed("value", true)
                    .text(function(d){ return d.datalen.toFixed(3); });
            }
        }
}
