window.onload = function(){

// set wmata api key.
// temp key can be get at https://developer.wmata.com/Products
var wmata_api_key = 'e1eee2b5677f408da40af8480a5fd5a8';

//initialize and load map
var map = L.map('map', {
    center: [38.9072, -77.0369],
    zoom: 13
});

// initialize base map
L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// initialize geojson layers
var stations = L.geoJSON(null, {
    pointToLayer: function (feature, latlng) {
        return L.marker(latlng, {icon: L.icon({iconUrl: 'js/images/station-icon.png', iconSize: [15, 15]}), title: feature.properties.NAME}).on('click', function(){
            let stationCode = feature.properties.CODE;

            // load station info
            $.getJSON('http://192.168.1.165:8080/geoserver/ges772/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=ges772:MetroStations4326&outputFormat=application/json&cql_filter=CODE=%27'+stationCode+'%27',function (data){
                let stationCode = data.features[0].properties.CODE
                let stationName = data.features[0].properties.NAME;
                let stationAddress = data.features[0].properties.ADDRESS;
                let stationLines = data.features[0].properties.MetroLine;

                let stationDetails = `
                <div id=station-details>
                    <p><text class=menu-label>Station Code: </text>${stationCode}</p>
                    <p><text class=menu-label>Station Name: </text>${stationName}</p>
                    <p><text class=menu-label>Station Address: </text>${stationAddress}</p>
                    <p><text class=menu-label>Operating Lines: </text>${stationLines}</p>
                    <div id=station-details-submenu>
                        <button id=entrance-btn>Station Entrance</button><button id=next-train-btn>Next Train</button><button id=parking-details-btn>Parking Info</button><button id=incidents-btn>Incidents</button>
                    </div>
                    <br>
                    <div id=station-query-output></div>
                </div>
                `
                // load station details
                $('#right-panel-bottom').html(stationDetails);

                // load station entrances
                $('#entrance-btn').unbind().click(function(){
                    let qryURL = 'http://192.168.1.165:8080/geoserver/ges772/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=ges772:MetroStationEntrances4326&outputFormat=application/json&cql_filter=CODE=\''+stationCode+'\'';
                    $.getJSON(qryURL, function(data){
                        stationEntrances.clearLayers();
                        stationEntrances.addData(data);
                        map.fitBounds(stationEntrances.getBounds());
                    });
                });

                // get next-train times
                $('#next-train-btn').unbind().click(function(){
                    $.ajax({
                        beforeSend: function(request) {
                        request.setRequestHeader("api_Key", wmata_api_key);
                    },
                    dataType: "json",
                    url: 'https://api.wmata.com/StationPrediction.svc/json/GetPrediction/{StationCodes}?StationCode='+stationCode,
                    success: function(data) {
                        if (data.Trains.length === 0){
                            alert('No train arrival predictions currently available for this station.');
                        } else {
                            // clear any current train predictions
                            $('#station-query-output').empty()
                            // load most current train predictions
                            $('#station-query-output').append('<table id=train-prediction-tbl><tr><th>Destination</th><th>Line</th><th>ETA</th></tr></table>');
                            for (let i=0; i<data.Trains.length; i++){
                                let destination = data.Trains[i].DestinationName;
                                let eta = data.Trains[i].Min;
                                let line = data.Trains[i].Line;
                                let row = `<tr><td>${destination}</td><td>${line}</td><td>${eta}</td></tr>`;
                                $('#train-prediction-tbl').append(row);
                            }
                        }
                    }
                    });
                });

                // get station parking details
                $('#parking-details-btn').unbind().click(function(){
                    $.ajax({
                        beforeSend: function(request) {
                        request.setRequestHeader("api_Key", wmata_api_key);
                    },
                    dataType: "json",
                    url: 'https://api.wmata.com/Rail.svc/json/jStationParking?StationCode='+stationCode,
                    success: function(data) {
                        if (data.StationsParking.length === 0){
                            alert('No parking information available for this station.');
                        } else {
                            // clear any current query outputs
                            $('#station-query-output').empty()
                            // load most current query outputs
                            let stationNotes = data.StationsParking[0].Notes;
                            let spaceAllDay = data.StationsParking[0].AllDayParking.TotalCount;
                            let spaceShortTerm = data.StationsParking[0].ShortTermParking.TotalCount;
                            let costRider = data.StationsParking[0].AllDayParking.RiderCost;
                            let nonRiderCost = data.StationsParking[0].AllDayParking.NonRiderCost;
                            let nonRiderNotes = data.StationsParking[0].ShortTermParking.Notes;
                            $('#station-query-output').append(`
                                <table>
                                    <tr><th></th><th>All Day</th><th>Short Term</th></tr>
                                    <tr><td>Total Parking Spaces</td><td>${spaceAllDay}</td><td>${spaceShortTerm}</td></tr>
                                    <tr><th></th><th>Rider</th><th>Non-Rider</th></tr>
                                    <tr><td>All Day Price</td><td>$ ${costRider}</td><td>$ ${nonRiderCost}</td></tr>
                                </table>
                                <text class=menu-label>Station Parking Notes: </text>${stationNotes}<br>
                                <text class=menu-label>Non-Rider Parking Notes: </text>${nonRiderNotes}`);
                        }
                    }
                    });
                });

                // get station incidents
                $('#incidents-btn').unbind().click(function(){
                    $.ajax({
                        beforeSend: function(request) {
                        request.setRequestHeader("api_Key", wmata_api_key);
                    },
                    dataType: "json",
                    url: 'https://api.wmata.com/Incidents.svc/json/Incidents',
                    success: function(data) {
                        if (data.Incidents.length === 0){
                            alert('No parking information available for this station.');
                        } else {
                            // clear any current query outputs
                            $('#station-query-output').empty()

                            $('#station-query-output').append('<table id=incidents-tbl><tr><th>Incident</th><th>Description</th><th>Lines Affected</th></tr></table>');
                            // load most current query outputs
                            for (let i=0; i<data.Incidents.length; i++){
                                let incidentDescription = data.Incidents[i].Description;
                                let incidentLines = data.Incidents[i].LinesAffected;
                                let incidentType = data.Incidents[i].IncidentType;
                                $('#incidents-tbl').append(`<tr><td>${incidentType}</td><td>${incidentDescription}</td><td>${incidentLines}</td></tr>`);
                            }
                        }
                    }
                    });
                });

            });
        });
    }
}).addTo(map);

var stationEntrances = L.geoJSON(null, {
    pointToLayer: function (feature, latlng) {
        return L.marker(latlng, {icon: L.icon({iconUrl: 'js/images/entrance-icon.png', iconSize: [15, 15]}), title: feature.properties.NAME}).bindPopup(`
            <text class=menu-label>Name: </text>${feature.properties.NAME}<br>
            <text class=menu-label>Address: </text>${feature.properties.ADDRESS}<br>
            <text class=menu-label>Exit To: </text>${feature.properties.EXIT_TO_ST}<br>
            <text class=menu-label>Metro Line: </text>${feature.properties.LINE}
            `);
    }
}).addTo(map);

loadSearchMenu();

// load the faceted search menu
function loadSearchMenu(){
    // load search menu
    let mainForm = `<form id=search-form>
        <div><text class=menu-label>Search Mode:</text>
        <br>
        <select id=search-mode-options>
            <option value="All">All Stations</option>
            <option value="Nearest">Nearest</option>
            <option value="Attributes">Attributes</option>
        </select></div>
        <br>
        <button id=search-btn>Search</button>
    </form>
    `

    $('#right-panel-top').html(mainForm);

    $('#search-mode-options').val('All Stations');

    $('#search-mode-options').bind('change', function(){
        // handle changes to menus/dropdowns based on user interaction
        let searchMode = $('#search-mode-options').find(':selected').text();
        if (searchMode === 'Nearest'){
            loadDistanceSearchOptions();
        } else if (searchMode === 'Attributes'){
            loadAttributeSearchOptions();
        } else {
            removeDynamicParams();
        }

    // execute search
    $('#search-btn').unbind().click(function(){
        let searchMode = $('#search-mode-options').find(':selected').text();

        if (searchMode === 'Nearest'){
            getNearestStation();
        } else if (searchMode === 'Attributes'){
            getFacetedStations();
        } else if (searchMode === 'All Stations'){
            getAllStations();
        }
        return false;
    });

    });
}

// find all stations
function getAllStations(){
    let qryURL = 'http://192.168.1.165:8080/geoserver/ges772/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=ges772:MetroStations4326&outputFormat=application/json';
    
    // load new features returned by latest request
    $.getJSON(qryURL, function(data){
        stations.clearLayers();
        stationEntrances.clearLayers();
        stations.addData(data);
        map.fitBounds(stations.getBounds());
        $('#right-panel-bottom').html('Result: '+data.totalFeatures+' stations found.');
    });
}

function getNearestStation(){
    // get user location
    let loc = map.locate({watch:false});

    // get search radius
    let searchDistance = $('#search-radius').val();
    let searchDistanceDegrees = parseInt(searchDistance) * 0.01628546;

    // NEED TO FIGURE OUT WHY THIS EVENT IS FIRING i TIMES ON THE ith CLICK OF THE SEARCH BUTTON
    loc.on('locationfound', function(location){
        let userlat = location.latitude;
        let userlon = location.longitude;
        let qryURL = 'http://192.168.1.165:8080/geoserver/ges772/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=ges772:MetroStations4326&cql_filter=DWITHIN(the_geom,Point('+userlon+' '+userlat+'),'+searchDistanceDegrees+',statute miles)&outputFormat=application/json';

        // load new features returned by latest request
        $.getJSON(qryURL, function(data){
            if (data.totalFeatures>0){
                stations.clearLayers();
                stationEntrances.clearLayers();
                stations.addData(data);
                map.fitBounds(stations.getBounds());
                // TODO list station names in right pannel bottom
            } else {
                alert('No stations within '+searchDistance+ ' miles.');
            }
        });        
    });

    loc.on('locationerror', function(){
        alert('Unable to get user location.');
    });
}

function getFacetedStations(){
    let state = $('#state-options').find(':selected').text();
    let line = $('#line-color-options').find(':selected').text().toLowerCase();
    let linecount = $('#line-count-options').find(':selected').text();
    let lines;
    if (linecount === 'Single'){
        lines = 'LINECOUNT = 1';
    } else {
        lines = 'LINECOUNT > 1';
    }
    let filter = 'STATE=\''+state+'\' AND MetroLine like\'%25'+line+'%25\' AND '+lines;
    let qryURL = 'http://192.168.1.165:8080/geoserver/ges772/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=ges772:MetroStations4326&cql_filter='+filter+'&outputFormat=application/json';
    
        // load new features returned by latest request
    $.getJSON(qryURL, function(data){
        if (data.totalFeatures > 0){
            stations.clearLayers();
            stationEntrances.clearLayers();
            stations.addData(data);
            map.fitBounds(stations.getBounds());
            $('#right-panel-bottom').html('Result: '+data.totalFeatures+' stations found.');
        } else {
            $('#right-panel-bottom').html('There are no stations that meet the search criterion.');
        }
    });

}

// search for the nearest station to the user's current location
function loadDistanceSearchOptions(){
    removeDynamicParams();
    $('<div class=dynamic-parameter><text class=menu-label>Search Radius (Miles):</text><br><input id =search-radius type="text" name="distance" value="1"></div>').insertAfter('#search-mode-options');
}

// add faceted search options based on available attributes
function loadAttributeSearchOptions(){
    removeDynamicParams();
    let facetedOptions = `
    <div class=dynamic-parameter>
        <text class=menu-label>State:</text>
        <br>
        <select id=state-options>
            <option value="DC">DC</option>
            <option value="MD">MD</option>
            <option value="VA">VA</option>
        </select>
        <br>
    </div>
    <div class=dynamic-parameter><text class=menu-label>Line:</text>
    <br>
    <select id=line-color-options>
        <option value="Blue">Blue</option>
        <option value="Green">Green</option>
        <option value="Orange">Orange</option>
        <option value="Red">Red</option>
        <option value="Silver">Silver</option>
        <option value="Yellow">Yellow</option>
    </select>
    </div>
    <div class=dynamic-parameter><text class=menu-label>Lines Served:</text>
    <br>
    <select id=line-count-options>
        <option value="Single">Single</option>
        <option value="Multiple">Multiple</option>
    </select>
    </div>
    `
    $(facetedOptions).insertAfter('#search-mode-options');
}

// reset the search form to its initial state
function removeDynamicParams(){
    $('.dynamic-parameter').remove()
}

} //end file