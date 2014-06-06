/*global d3:false, nv:false*/
'use strict';
var uriBase = 'http://dev.maproulette.org/api/';
var challenges = [];
var users = [];
var overall = {};
var exclude_statuses = ['created', 'deleted', 'editing', 'available', 'assigned'];
var start_date = new Date('2014-01-01');
var end_date = new Date();
var drawnPieCharts = [];
var drawnHistoryCharts = [];
var pieLabelFormat = 'percent';

function asHistoricalData(data) {
    var transformedData = data.map( function(d) {
        console.log('getting data for ' + start_date + ' to ' + end_date);
        var series = [];
        for (var key in d.values) {
            var date = new Date(key);
            if (!(date < start_date || date > end_date)) {
                series.push({'x': key, 'y': d.values[key]});
            }
        }
        return {'key': d.key, 'values': series};
    });
    return transformedData;
}

function asPieData(data){
    var result = [];
    $.each(data, function( k, v ) {
        if (exclude_statuses.indexOf(k) === -1) {
            var row = {};
            row.label = k;
            row.value = v;
            result.push(row);
        }
    });
    return result;
}

function getData(for_type, identifier) {
    var uri = uriBase;
    if (for_type ==='user' || for_type === 'challenge') {
        uri += 'stats/' + for_type + '/' + identifier;
    } else {
        uri += 'stats';
    }

    // get and store summary
    $.ajax({
        url: uri,
        dataType: 'json',
        async: false,
        success: function( data ) {
            if (for_type === 'challenge') {
                $.each(challenges, function(index, challenge) {
                    if (challenge.slug === identifier) {
                        var dataobj = {};
                        dataobj.summary = data;
                        challenge.data = dataobj;
                    }
                });
            } else if (for_type ==='user') {
                $.each(users, function(index, user) {
                    if (user.id === identifier) {
                        var dataobj = {};
                        dataobj.summary = data;
                        user.data = dataobj;
                    }
                });
            } else {
                overall.summary = data;
            }
        }
    });

    // now get and store history
    var histUri = uri + '/history';
    $.ajax({
        url: histUri,
        dataType: 'json',
        async: false,
        success: function( data ) {
            if (for_type === 'challenge') {
                $.each(challenges, function(index, challenge) {
                    if (challenge.slug === identifier) {
                        // var dataobj = {};
                        // dataobj.historical = data;
                        challenge.data.historical = data;
                    }
                });
            } else if (for_type === 'user') {
                $.each(users, function(index, user) {
                    if (user.id === parseInt(identifier)) {
                        // var dataobj = {};
                        // dataobj.historical = data;
                        user.data.historical = data;
                    }
                });
            } else {
                overall.historical = data;
            }
        }
    });

    // get breakdown
    if ( for_type === 'challenge' || for_type === 'user' ) {
        var breakdown = ( for_type === 'challenge' ? 'users' : 'challenges' );
        var breakdownUri = uri + '/' + breakdown;
        $.ajax({
            url: breakdownUri,
            dataType: 'json',
            async: false,
            success: function( data ) {
                if (for_type === 'challenge') {
                    $.each(challenges, function(index, challenge) {
                        if (challenge.slug === identifier) {
                            // var dataobj = {};
                            // dataobj.historical = data;
                            challenge.data.breakdown = data;
                        }
                    });
                } else if (for_type === 'user') {
                    $.each(users, function(index, user) {
                        if (user.id === parseInt(identifier)) {
                            // var dataobj = {};
                            // dataobj.historical = data;
                            user.data.breakdown = data;
                        }
                    });
                } else {
                    overall.historical = data;
                }
            }
        });
    }
}

function drawPie(data, selector) {
    console.log(data);
    var hasLegend = !selector.startsWith('user');
    d3.selectAll('#' + selector + ' svg > *').remove();
    nv.addGraph(function() {
        var chart = nv.models.pieChart()
            .x(function(d) { return d.label; })
            .y(function(d) { return d.value; })
            .labelType(pieLabelFormat)
            .showLabels(true)
            .showLegend(hasLegend);

        d3.select('#' + selector + ' svg')
            .datum(asPieData(data))
            .transition()
            .duration(350)
            .call(chart);

        drawnPieCharts.push([data, selector]);
        return chart;
    });
}

function drawHistory(data, selector) {
    console.log('will draw history chart at ' + selector);
    d3.selectAll('#' + selector + ' svg > *').remove();
    nv.addGraph(function() {
        var chart = nv.models.multiBarChart()
            .transitionDuration(350)
            .reduceXTicks(true)   //If 'false', every single x-axis tick label will be rendered.
            .rotateLabels(0)      //Angle to rotate x-axis labels.
            .showControls(true)   //Allow user to switch between 'Grouped' and 'Stacked' mode.
            .groupSpacing(0.1)   //Distance between each group of bars.
            .stacked(true)
        ;

        chart.xAxis
            .tickFormat(function(d) { return d3.time.format('%b %d')(new Date(d)); });

        chart.yAxis
            .tickFormat(d3.format(',f'));

        d3.select('#' + selector + ' svg')
            .datum(asHistoricalData(data))
            .call(chart);

        nv.utils.windowResize(chart.update);

        drawnHistoryCharts.push([data, selector]);
        return chart;
    });
}

function drawBreakdown(data, selector) {
    $.each(data, function( index, breakdown ) {
        if (breakdown.key !== null) {
            var elemId = breakdown.key.replace(/\s/g, '');
            $('#' + selector).append('<div class="breakdown" id="' + elemId + '""><h3>' + breakdown.key + '</h3><svg style="height:200px;width:200px"></div>');
            drawPie(breakdown.values, 'breakdown-' + elemId);
            console.log(elemId);
        }
    });
}

function redrawAllCharts() {
    var pieChartsToRedraw = drawnPieCharts;
    var historyChartsToRedraw = drawnHistoryCharts;
    var chartToUpdate;
    drawnPieCharts = [];
    drawnHistoryCharts = [];
    while (pieChartsToRedraw.length > 0) {
        chartToUpdate = pieChartsToRedraw.pop();
        console.log('redrawing ' + chartToUpdate[0]);
        drawPie(chartToUpdate[0], chartToUpdate[1]);
    }
    while (historyChartsToRedraw.length > 0) {
        chartToUpdate = historyChartsToRedraw.pop();
        console.log('redrawing ' + chartToUpdate[0]);
        drawHistory(chartToUpdate[0], chartToUpdate[1]);
    }
}

$(document).ready( function () {
    // hook up loading div
    var $loading = $('#wait').hide();
    $(document).ajaxStart(function () {
        $loading.show();
    }).ajaxStop(function () {
        $loading.fadeOut();
    });

    // configure the date picker in settings and hook up events
    $('.datepicker').datepicker({
        autoclose: true,
        todayHighlight: true,
        todayBtn: true,
        endDate: '-0d'
    }).on('changeDate', function(e){
        if ($(e.target).attr('id') === 'date-start') {
            start_date = e.date;
            console.log('start date set to ' + start_date);
            redrawAllCharts();
        }
        if ($(e.target).attr('id') === 'date-end') {
            end_date = e.date;
            console.log('end date set to ' + end_date);
            redrawAllCharts();
        }
    });
    $('#date-start').datepicker('setDate', start_date);
    $('#date-end').datepicker('setDate', end_date);

    // get the list of challenges
    $.getJSON(uriBase + 'challenges', function( data ) {
        $.each( data, function( index, challenge ) {
            challenge.data = null;
            challenges.push(challenge);
        });
    // and populate the dropdown
    }).then( function() {
        $('#challenge-select').empty();
        $.each( challenges, function( index, challenge ) {
            $('#challenge-select').append('<option value="' + challenge.slug + '">' + challenge.title + '</option>');
        });
        $('#challenge-select').prepend('<option value="0" selected disabled>Select a challenge</option>');
        //$('#challenge-select').selectpicker();
    });

    // get the list of users
    $.getJSON(uriBase + 'users', function( data ) {
        $.each( data, function( index, user ) {
            user.data = null;
            users.push(user);
        });
    // and populate the dropdown
    }).then( function() {
        $('#user-select').empty();
        $.each( users, function( index, user ) {
            $('#user-select').append('<option value="' + user.id + '">' + user.display_name + '</option>');
        });
        $('#user-select').prepend('<option value="0" selected disabled>Select a user</option>');
        //$('#user-select').selectpicker();
    });

    // attach handler for challenge select box

    $('#challenge-select').change( function() {
        var slug = $(this).find('option:selected').attr('value');
        $.each( challenges, function( index, challenge ) {
            if(challenge.slug === slug) {
                if (challenge.data === null) {
                    $.when(getData('challenge', slug)).then(function () {
                        drawPie(challenge.data.summary, 'chart-challenge-summary');
                        drawHistory(challenge.data.historical, 'chart-challenge-history');
                        drawBreakdown(challenge.data.breakdown, 'chart-challenge-breakdown');
                    });
                } else {
                    drawPie(challenge.data.summary, 'chart-challenge-summary');
                    drawHistory(challenge.data.historical, 'chart-challenge-history');
                    drawBreakdown(challenge.data.breakdown, 'chart-challenge-breakdown');
                }
            }
        });
    });

    // attach handler for user select box
    $('#user-select').change( function() {
        $(this).find('option[value="0"]').remove();
        var uid = parseInt($(this).find('option:selected').attr('value'));
        console.log(uid + ' selected');
        $.each( users, function( index, user ) {
            if(user.id === uid) {
                if (user.data === null) {
                    $.when(getData('user', uid)).then(function () {
                        drawPie(user.data.summary, 'chart-user-summary');
                        drawHistory(user.data.historical, 'chart-user-history');
                        drawBreakdown(user.data.breakdown, 'chart-user-breakdown');
                    });
                } else {
                    drawPie(user.data.summary, 'chart-user-summary');
                    drawHistory(user.data.historical, 'chart-user-history');
                    drawBreakdown(user.data.breakdown, 'chart-user-breakdown');
                }
            }
        });
    });

    // draw the overall history chart
    $.when(getData('overall', null)).then(function () {
        drawHistory(overall.historical, 'chart-overall-history');
    });

    // add redraw event when tab is clicked to force NVD3 to redraw the charts at the right size.
    $("ul.nav-tabs > li > a").on("shown.bs.tab", function (e) {
        console.log($(e.target).attr("href").substr(1));
        $(window).trigger('resize');
    });


});




