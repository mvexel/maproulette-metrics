/*global d3:false, nv:false*/
var uriBase = 'http://dev.maproulette.org/api/';
var challenges = [];
var users = [];
var overall = {};

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

function getData(for_type, identifier) {
    'use strict';

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
    uri += '/history';
    $.ajax({
        url: uri,
        dataType: 'json',
        async: false,
        success: function( data ) {
            if (for_type === 'challenge') {
                $.each(challenges, function(index, challenge) {
                    if (challenge.slug === identifier) {
                        var dataobj = {};
                        dataobj.historical = data;
                        challenge.data = dataobj;
                    }
                });
            } else if (for_type === 'user') {
                $.each(users, function(index, user) {
                    if (user.id === identifier) {
                        var dataobj = {};
                        dataobj.historical = data;
                        user.data = dataobj;
                    }
                });
            } else {
                overall.historical = data;
            }
        }
    });
}

function drawHistory(data, selector) {
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

        d3.select('#' + selector + ' svg')
            .datum(transform(data))
            .call(chart);

        nv.utils.windowResize(chart.update);

        return chart;
    });
}

$(document).ready( function () {

    'use strict';

    // hook up loading div
    var $loading = $('#wait').hide();
    $(document).ajaxStart(function () {
        $loading.show();
    }).ajaxStop(function () {
        $loading.fadeOut();
    });

    // configure the date picker in settings
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
        $('#challenge-select').selectpicker();
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
        $('#user-select').selectpicker();
    });

    // attach handler for challenge select box
    $('#challenge-select').change( function() {
        $(this).find('option[value="0"]').remove();
        var slug = $(this).find('option:selected').attr('value');
        $.each( challenges, function( index, challenge ) {
            if(challenge.slug === slug) {
                if (challenge.data === null) {
                    console.log('loading data for ' + slug);
                    getData('challenge', slug);
                } else {
                    console.log('data for ' + slug + ' already loaded, repainting');
                    console.log(challenge.data);
                }
            }
        });
    });

    // attach handler for user select box
    $('#user-select').change( function() {
        $(this).find('option[value="0"]').remove();
        var uid = $(this).find('option:selected').attr('value');
        $.each( users, function( index, user ) {
            if(user.id === parseInt(uid)) {
                if (user.data === null) {
                    console.log('loading data for ' + uid);
                    getData('user', uid);
                } else {
                    console.log('data for ' + uid + ' already loaded, repainting');
                    console.log(user.data);
                }
            }
        });
    });

    // draw the overall history chart
    $.when(getData('overall', null)).then(function () {
        console.log(overall);
        drawHistory(overall.historical, 'chart-overall-history');
    });
});




