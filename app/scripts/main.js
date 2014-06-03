/*global d3:false, nv:false */
var uriBase = 'http://dev.maproulette.org/api/';

$(document).ready( function () {
    // configure the date picker in settings
    'use strict';
    var challenges = [];
    $('#datepicker-container .input-daterange').datepicker({
        autoclose: true,
        todayHighlight: true,
        todayBtn: true,
        endDate: '-0d',
        startDate: '-1y'
    });
    // get the list of challenges
    $.getJSON(uriBase + 'challenges', function( data ) {
        $.each( data, function( index, challenge ) {
            console.log(challenge);
            challenges.push({'slug': challenge.slug, 'title': challenge.title});
        });
    }).then( function() {
        $.each( challenges, function( index, challenge ) {
            $('#challenge-select').append('<option value="' + challenge.slug + '">' + challenge.title + '</option>');
        });
    });
});

d3.json(uriBase + 'stats/history', function( error, data ) {
    'use strict';
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

        var transformedData = data.map( function(d) {
            var series = [];
            for (var key in d.values) {
                series.push({'x': key, 'y': d.values[key]});
            }
            return {'key': d.key, 'values': series};
        });

        d3.select('svg')
            .datum(transformedData)
            .call(chart);

        nv.utils.windowResize(chart.update);

        return chart;
    });
});

$('#challenge-select').chosen();