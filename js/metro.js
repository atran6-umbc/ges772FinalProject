window.onload = function(){

//initialize and load map
var map = L.map('map', {
    center: [38.9072, -77.0369],
    zoom: 13
});

L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// initialize station and entrance layer styles
var stationMarkerOptions = {
    icon: L.icon({iconUrl: 'js/images/station-icon.png', iconSize: [15, 15]}),
    title: 'Metro Station'
};

var entranceMarkerOptions = {
    icon: L.icon({iconUrl: 'js/images/entrance-icon.png', iconSize: [30, 30]}),
    title: 'Metro Station Entrance'
};

// define station and entrance layer behavior
var stations = L.geoJSON(null, {
    pointToLayer: function (feature, latlng) {
        return L.marker(latlng, stationMarkerOptions).on('click', function(){
            // TODO load station details into right-panel bottom
            // by making request to WMATA API
        });
    }
}).addTo(map);

var stationEntrances = L.geoJSON(null, {
    pointToLayer: function (feature, latlng) {
        return L.marker(latlng, entranceMarkerOptions);
    }
}).addTo(map);

loadSearchMenu();

// alod the faceted search menu
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
        console.log(location);
        let userlat = location.latitude;
        let userlon = location.longitude;
        let qryURL = 'http://192.168.1.165:8080/geoserver/ges772/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=ges772:MetroStations4326&cql_filter=DWITHIN(the_geom,Point('+userlon+' '+userlat+'),'+searchDistanceDegrees+',statute miles)&outputFormat=application/json';

        // load new features returned by latest request
        $.getJSON(qryURL, function(data){
            if (data.totalFeatures>0){
                stations.clearLayers();
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