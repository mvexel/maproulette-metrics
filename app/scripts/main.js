/*global d3:false, nv:false, moment:false*/
var uriBase = 'http://dev.maproulette.org/api/';
var challenges = [];
var users = [];

function transform(data) {
    'use strict';
    var transformedData = data.map( function(d) {
        var series = [];
        for (var key in d.values) {
            series.push({'x': key, 'y': d.values[key]});
        }
        return {'key': d.key, 'values': series};
    });
    return transformedData;
}

function drawHistory(type, start, end, selector) {
    'use strict';
    console.log(selector);
    d3.json(uriBase + 'stats/history', function( error, data ) {
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

            d3.select(selector)
                .datum(transform(data))
                .call(chart);

            nv.utils.windowResize(chart.update);

            return chart;
        });
    });
}

$(document).ready( function () {
    // configure the date picker in settings
    'use strict';
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
            challenges.push({'slug': challenge.slug, 'title': challenge.title});
        });
    // and populate the dropdown
    }).then( function() {
        $('#challenge-select').empty();
        $.each( challenges, function( index, challenge ) {
            console.log(challenge.title);
            $('#challenge-select').append('<option value="' + challenge.slug + '">' + challenge.title + '</option>');
        });
        $('#challenge-select').prepend('<option value="0" selected><em>Select a challenge</em></option>');
        $('#challenge-select').selectpicker();
    });

    // get the list of users
    $.getJSON(uriBase + 'users', function( data ) {
        $.each( data, function( index, user ) {
            users.push({'id': user.id, 'display_name': user.display_name});
        });
    // and populate the dropdown
    }).then( function() {
        $('#user-select').empty();
        $.each( users, function( index, user ) {
            console.log(user.display_name);
            $('#user-select').append('<option value="' + user.id + '">' + user.display_name + '</option>');
        });
        $('#user-select').selectpicker();
    });

    // attach handlers
    $('#challenge-select').change( function() {
        $(this).find('option[value="0"]').remove();
        var slug = $(this).find('option:selected').attr('value');
        console.log( 'challenge ' + slug + ' selected');
    });
    $('#user-select').change( function() {
        var uid = $(this).find('option:selected').attr('value');
        console.log( 'user ' + uid + ' selected');
    });
    console.log('ready!');

});

drawHistory('overall', moment().subtract('years', 100), moment(), '#chart-overall-history');

