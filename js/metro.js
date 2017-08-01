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

loadSearchMenu();

// search for the nearest station to the user's current location
function loadDistanceSearchOptions(){
    removeDynamicParams();
    $('<br><div class=dynamic-parameter><text class=menu-label>Search Radius (Meters):</text><br><input type="text" name="distance" value="50"></div>').insertAfter('#form-select-options');
}

// search for stations based on a faceted search
function loadAttributeSearchOptions(){
    removeDynamicParams();
    let facetedOptions = `
    <div class=dynamic-parameter><text class=menu-label>State:</text><br><input type="text" name="state" value="MD"></div>
    <div class=dynamic-parameter><text class=menu-label>Line:</text><br><input type="text" name="line" value="red"></div>
    <div class=dynamic-parameter><text class=menu-label>Lines Served:</text><br><input type="text" name="linecount" value="1"></div>
    `
    $(facetedOptions).insertAfter('#form-select-options');

}

function removeDynamicParams(){
    $('.dynamic-parameter').remove()
}

// remove search parameters and reset the form to its initial state
function loadSearchMenu(){
    // load search menu
    let mainForm = `<form id=search-form>
        <div><text class=menu-label>Search Type:</text>
        <br>
        <select id=form-select-options>
            <option value=""></option>
            <option value="nearest">Distance</option>
            <option value="faceted">Attributes</option>
        </select></div>
        <br>
        <button id=search-btn>Search</button>
    </form>
    `    
    $('#right-panel-top').html(mainForm);

    $('#form-select-options').bind('change', function(){
        let currentValue = $('#form-select-options').find(':selected').text();
        if (currentValue === 'Distance'){
            loadDistanceSearchOptions();
        } else if (currentValue === 'Attributes'){
            loadAttributeSearchOptions();
        } else {
            removeDynamicParams();
        }

    });
}

} //end file