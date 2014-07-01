/*global d3:false, nv:false*/
'use strict';
var uriBase = 'http://maproulette.org/api/';
//var uriBase = 'http://dev.maproulette.org/api/';
//var uriBase = 'http://localhost:5000/api/';
var challenges = [];
var users = [];
var overall = {};
var user_statuses = ['alreadyfixed', 'falsepositive', 'fixed', 'skipped'];
var start_date = new Date('2014-01-01');
var end_date = new Date();
var drawnPieCharts = [];
var drawnHistoryCharts = [];
var pieLabelFormat = 'percent';
var showMachineStatuses = false;

function dataForChallenge(slug) {
    console.log('getting challenge data ' + slug);
    for (var i = 0; i < challenges.length; i++) {
        var challenge = challenges[i];
        if (challenge.slug === slug) {
            console.log('returning ' + challenge.slug);
            return challenge;
        }
    }
    return null;
}

function dataForUser(uid) {
    console.log('getting user data ' + uid);
    for (var i = 0; i < users.length; i++) {
        var user = users[i];
        if (user.id === uid) {
            console.log('returning ' + uid);
            return user;
        }
    }
    return null;
}

function asHistoricalData(data) {
    var transformedData = data.map( function(d) {
        if (user_statuses.indexOf(d.key) === -1 && !showMachineStatuses) {
            return;
        }
        // Get the dates we need to output
        var dates = [];
        for (var key in d.values) {
            if (d.values.hasOwnProperty(key)) { dates.push(key); }
        }
        // sort them
        dates.sort();
        // and the value series for each date
        var series = [];
        for (var i = 0; i < dates.length; i++) {
            var date = new Date(dates[i]);
            if (!(date < start_date || date > end_date)) {
                series.push({'x': dates[i], 'y': d.values[dates[i]]});
            }
        }
        return {'key': d.key, 'values': series};
    });
    // remove empty items where we skipped keys
    for (var i = 0; i < transformedData.length; i++) {
        if (transformedData[i] === undefined) {
            transformedData.splice(i, 1);
            i--;
        }
    }
    // return the result
    return transformedData;
}

function asPieData(data){
    var result = [];
    for (var i = 0; i < user_statuses.length; i++) {
        var row = {};
        row.label = user_statuses[i];
        row.value = user_statuses[i] in data ? data[user_statuses[i]] : 0;
        result.push(row);
    }
    return result;
}

function getHistoricalData(opts) {
    var hasChallenge = opts.hasOwnProperty('challenge_slug');
    var hasUser = opts.hasOwnProperty('uid');
    var uri = uriBase + 'stats';
    if (hasChallenge) { uri += '/challenge/' + opts.challenge_slug; }
    if (hasUser) { uri += '/user/' + opts.uid; }
    uri += '/history';

    $.ajax({
        url: uri,
        dataType: 'json',
        async: false,
        success: function( data ) {
            if (hasChallenge) {
                // we have both a challenge and a user, store in challenge object
                if (hasUser) {
                    $.each(users, function(index, user) {
                        if (user.id === parseInt(opts.uid)) {
                            if (!user.hasOwnProperty('challenges')) {
                                user.challenges = {};
                            }
                            user.challenges[opts.challenge_slug] = data;
                        }
                    });
                    return;
                // we have just a challenge, store in challenge object
                } else {
                    $.each(challenges, function(index, challenge) {
                        if (challenge.slug === opts.challenge_slug) {
                            // var dataobj = {};
                            // dataobj.historical = data;
                            challenge.data.historical = data;
                        }
                    });
                    return;
                }
            // we
            } else if (hasUser) {
                $.each(users, function(index, user) {
                    if (user.id === parseInt(opts.uid)) {
                        // var dataobj = {};
                        // dataobj.historical = data;
                        user.data.historical = data;
                    }
                });
                return;
            } else {
                overall.historical = data;
            }
        }
    });
}

// FIXME requires refactoring!
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

    // get historical data
    var key = for_type === 'challenge' ? 'challenge_slug' : 'uid';
    var opts = {};
    if (identifier !== null) { opts[key] = identifier; }

    getHistoricalData(opts);

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
                            console.log('breakdown data: ' + data);
                        }
                    });
                } else if (for_type === 'user') {
                    $.each(users, function(index, user) {
                        if (user.id === parseInt(identifier)) {
                            // var dataobj = {};
                            // dataobj.historical = data;
                            user.data.breakdown = data;
                            // for users, get challenge histories as well.
                            for (var i = 0 ; i < data.length ; i++) {
                                var challenge_slug = (data[i].key);
                                var uid = user.id;
                                getHistoricalData({'challenge_slug': challenge_slug, 'uid': uid});
                            }
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
    // legends are for closers
    var hasLegend = !selector.startsWith('breakdown');
    // remove all existing content from the element
    d3.selectAll('#' + selector + ' svg > *').remove();
    // add the pie chart
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
    // remove all existing content from the element
    d3.selectAll('#' + selector + ' svg > *').remove();
    // add the compund bar chart
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

function asSafeSelectorString(s) {
    return s.replace(/[^a-zA-Z0-9]/g, '_');
}

function drawBreakdown(opts) {
    var hasUser = opts.hasOwnProperty('uid');
    var selector = 'chart-';
    selector += hasUser ? 'user-breakdown' : 'challenge-breakdown';
    $('#' + selector).empty();
    var d = hasUser ? dataForUser(opts.uid) : dataForChallenge(opts.challenge_slug);
    $.each(d.data.breakdown, function( index, breakdown ) {
        if (breakdown.key !== null) {
            var elemId = 'breakdown-' + asSafeSelectorString(breakdown.key);
            // FIXME unsafe
            $('#' + selector).append('<div class="breakdown"><h3>' + breakdown.key + '</h3><div><span id="' + elemId + '"><svg style="height:200px;width:200px"></span>');
            drawPie(breakdown.values, elemId);
            if (hasUser) {
                console.log('will also draw challenge history for this user: ' + d.id + ' and challenge: ' + breakdown.key);
                elemId += '-history';
                $('#' + selector).append('<span id="' + elemId + '"><svg style="height:200px;width:500px"></span>');
                drawHistory(d.challenges[breakdown.key], elemId);
            }
            $('#' + selector).append('</div></div>');
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
        drawPie(chartToUpdate[0], chartToUpdate[1]);
    }
    while (historyChartsToRedraw.length > 0) {
        chartToUpdate = historyChartsToRedraw.pop();
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
            redrawAllCharts();
        }
        if ($(e.target).attr('id') === 'date-end') {
            end_date = e.date;
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
                // if we don't have the challenge data yet, get it.
                if (challenge.data === null) {
                    console.log('need to go get data for ' + challenge.slug);
                    $.when(getData('challenge', slug)).then(function () {
                        drawPie(challenge.data.summary, 'chart-challenge-summary');
                        drawHistory(challenge.data.historical, 'chart-challenge-history');
                        drawBreakdown({'challenge_slug': slug});
                    });
                // or else redraw
                } else {
                    drawPie(challenge.data.summary, 'chart-challenge-summary');
                    drawHistory(challenge.data.historical, 'chart-challenge-history');
                    drawBreakdown({'challenge_slug': slug});
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
                    console.log('need to go get data for ' + user.id);
                    $.when(getData('user', uid)).then(function () {
                        drawPie(user.data.summary, 'chart-user-summary');
                        drawHistory(user.data.historical, 'chart-user-history');
                        drawBreakdown({'uid': uid});
                    });
                } else {
                    drawPie(user.data.summary, 'chart-user-summary');
                    drawHistory(user.data.historical, 'chart-user-history');
                    drawBreakdown({'uid': uid});
                }
            }
        });
    });

    // hook up the machine statuses checkbox
    $('#chk_machinestatuses').change(function() {
        showMachineStatuses = this.checked;
        console.log('machine statuses rendered: ' + showMachineStatuses);
        redrawAllCharts();
    });

    // draw the overall history chart
    $.when(getData('overall', null)).then(function () {
        drawHistory(overall.historical, 'chart-overall-history');
    });

    // add redraw event when tab is clicked to force NVD3 to redraw the charts at the right size.
    $('ul.nav-tabs > li > a').on('shown.bs.tab', function (e) {
        console.log($(e.target).attr('href').substr(1));
        $(window).trigger('resize');
    });


});




