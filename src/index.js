// Function to request specific object data from the government Ontario website.
async function getApiData(tile) {
	console.log("Requesting data from the API..");
	let response = await fetch('https://essosapi20220512144031.azurewebsites.net/Land/QueryLands', {
		method: "POST",
		body: JSON.stringify({
			tile: tile,
			designation: "General Use Area",
			extraFilter: "usages['Recreation Activities and Facilities']['Crown Land Recreation']='Yes'"
		}),
		headers: {
			"Content-type": "application/json"
		}
	});
	let data = await response.json()
	console.log(`Recieved ${data.length} data points.`);
	return data;
}

// Function to add logo to the map with link to website.
function MyLogoControl(controlDiv) {
	controlDiv.style.padding = '5px';
	var logo = document.createElement('IMG');
	logo.src = '../img/logo.png';
	logo.style.cursor = 'pointer';
	logo.s
	controlDiv.appendChild(logo);

	logo.addEventListener('click', function () {
		window.location = 'https://www.citizencrown.ca/';
	});
	console.log("Logo map control loaded.");
}

// Function to execute geolocation.
function attemptGeolocation(map) {
	console.log("Attempting to use geolocation.");
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(
			(position) => {
				const pos = {
					lat: position.coords.latitude,
					lng: position.coords.longitude,
				};
				addMarker(map, pos);
			},
			() => {
				window.alert("The Geolocation service failed. You might need to allow access to your location.");
				loadApiMapData(map);
			}
		);
	}
}

// Function to add marker.
function addMarker(map, pos) {
	var marker = new google.maps.Marker({
		position: { lat: pos.lat, lng: pos.lng },
		map: map,
		icon: "../img/marker.png",
	});
	marker.setMap(map);
	map.panTo(marker.position);
	animateMapZoomTo(map, 10);
}

// Function to animate zoom.
function animateMapZoomTo(map, targetZoom) {
	var currentZoom = arguments[2] || map.getZoom();
	if (currentZoom != targetZoom) {
		google.maps.event.addListenerOnce(map, 'zoom_changed', function (event) {
			animateMapZoomTo(map, targetZoom, currentZoom + (targetZoom > currentZoom ? 1 : -1));
		});
		setTimeout(function () { map.setZoom(currentZoom) }, 80);
	}
	else {
		console.log("Marker has been set based on geolocation. Smooth zoom complete.");
		loadApiMapData(map);
	}
}

// Function to get and render map bounds
function getMapBounds(map, debug) {
	console.log("Retrieving map bounds based on the camera position/zoom.");
	var bounds = map.getBounds();
	var areaBounds = {
		neCorner: bounds.getNorthEast(),
		swCorner: bounds.getSouthWest(),
		nwCorner: new google.maps.LatLng(bounds.getNorthEast().lat(), bounds.getSouthWest().lng()),
		seCorner: new google.maps.LatLng(bounds.getSouthWest().lat(), bounds.getNorthEast().lng())
	};

	if (debug) {
		console.log("Rendering debug zoom as polygon.");
		const polygonArea = new google.maps.Polygon({
			paths: [areaBounds.nwCorner, areaBounds.neCorner, areaBounds.seCorner, areaBounds.swCorner],
			strokeColor: "#DFC4AC",
			strokeOpacity: 1.0,
			strokeWeight: 2,
			fillColor: "#DFC4AC",
			fillOpacity: 0.25,
		});
		polygonArea.setMap(map);
	}
	return areaBounds;
}

// Function to load map data from API
function loadApiMapData(map) {
	// Get map bounds.
	var bounds = getMapBounds(map, true);

	// Create request tile. Must be counter clockwise starting with the top-left corner.
	var tile = [[parseFloat(bounds.nwCorner.lng().toFixed(7)), parseFloat(bounds.nwCorner.lat().toFixed(7))],
	[parseFloat(bounds.swCorner.lng().toFixed(7)), parseFloat(bounds.swCorner.lat().toFixed(7))],
	[parseFloat(bounds.seCorner.lng().toFixed(7)), parseFloat(bounds.seCorner.lat().toFixed(7))],
	[parseFloat(bounds.neCorner.lng().toFixed(7)), parseFloat(bounds.neCorner.lat().toFixed(7))],
	[parseFloat(bounds.nwCorner.lng().toFixed(7)), parseFloat(bounds.nwCorner.lat().toFixed(7))]];

	// Get Api data.
	getApiData(tile).then(data => {
		console.log("Parsing debug API data to render to map.");

		// Iterate through each features geometry set.
		data.forEach(feature => {

			// Create coord paths for map.
			var rings = feature.geometry;
			var paths = new Array(rings.length);
			rings.forEach((group, group_index) => {
				paths[group_index] = new Array(group.length);
				group.forEach((region, region_index) => {
					paths[group_index][region_index] = { lng: region[0], lat: region[1] };
				})
			});

			// Construct the polygon.
			const polygonArea = new google.maps.Polygon({
				paths: paths,
				strokeColor: "#F58672",
				strokeOpacity: 1.0,
				strokeWeight: 2,
				fillColor: "#F58672",
				fillOpacity: 0.25,
			});

			polygonArea.setMap(map);
			console.log(`Created polygon(s) for: [${feature.id}] ${feature.nameEng} (${feature.designationEng})`);
		});
		console.log("Map finished.");
	});
}

// This example creates simple polygons representing crown land in Ontario.
function initMap() {
	const map = new google.maps.Map(document.getElementById("map"), {
		zoom: 6,
		mapTypeId: "terrain",
		disableDefaultUI: true,
	});
	console.log("Initializing map.");

	// Add logo control.
	const logoControlDiv = document.createElement("div");
	MyLogoControl(logoControlDiv)
	map.controls[google.maps.ControlPosition.TOP_LEFT].push(logoControlDiv);

	// Focus map position on Ontario.
	const geocoder = new google.maps.Geocoder();
	geocoder
		.geocode({ address: "Ontario" })
		.then((response) => {
			const position = response.results[0].geometry.location;
			map.setCenter(position);
			console.log("Map centered on Ontario.");

			attemptGeolocation(map);
		})
		.catch((exception) =>
			window.alert("Geocode was not successful for the following reason: " + exception)
		);
}
