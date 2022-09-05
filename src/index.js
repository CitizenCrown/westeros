// Function to request specific object data from the government Ontario website.
async function getApiData(bounds) {
	console.log("Requesting data from the API..");
	let response = await fetch('http://20.102.18.131/Land/QueryLands', {
		method: "POST",
		body: JSON.stringify({
			includeGeometry: true,
			gridSize: 0.00001,
			bounds: bounds
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
	controlDiv.appendChild(logo);

	logo.addEventListener('click', function () {
		window.location = 'https://www.citizencrown.ca/';
	});
	console.log("Logo map control loaded.");
}

// Function to trigger manual search from current view point.
function SearchControl(controlDiv, map) {
	controlDiv.style.padding = '5px';
	var logo = document.createElement('IMG');
	logo.src = '../img/search.png';
	logo.style.cursor = 'pointer';
	controlDiv.appendChild(logo);

	logo.addEventListener('click', function () {
		console.log("Performing search..");
		loadApiMapData(map);
	});
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
			strokeColor: "#3E5B58",
			strokeOpacity: 1.0,
			strokeWeight: 2,
			fillColor: "#3E5B58",
			fillOpacity: 0.10,
			clickable: false,
		});
		polygonArea.setMap(map);
	}
	return areaBounds;
}

// Function to get polygon paths from returned data
function getPolygonPaths(rings) {
	// Create coord paths for map.
	var rings = rings;
	var paths = new Array(rings.length);
	rings.forEach((group, group_index) => {
		paths[group_index] = new Array(group.length);
		group.forEach((region, region_index) => {
			paths[group_index][region_index] = { lng: region[0], lat: region[1] };
		})
	});
	return paths[0];
}

// Function to load map data from API
function loadApiMapData(map) {

	// Get map bounds.
	var mapBounds = getMapBounds(map, true);

	// Create request tile. Must be counter clockwise starting with the top-left corner.
	var coordinates = [[[parseFloat(mapBounds.nwCorner.lng().toFixed(7)), parseFloat(mapBounds.nwCorner.lat().toFixed(7))],
	[parseFloat(mapBounds.swCorner.lng().toFixed(7)), parseFloat(mapBounds.swCorner.lat().toFixed(7))],
	[parseFloat(mapBounds.seCorner.lng().toFixed(7)), parseFloat(mapBounds.seCorner.lat().toFixed(7))],
	[parseFloat(mapBounds.neCorner.lng().toFixed(7)), parseFloat(mapBounds.neCorner.lat().toFixed(7))],
	[parseFloat(mapBounds.nwCorner.lng().toFixed(7)), parseFloat(mapBounds.nwCorner.lat().toFixed(7))]]];

	// Create bounds object.
	var bounds = {
		type: "Polygon",
		coordinates: coordinates
	};

	// Get Api data.
	// TODO: Request geometry separately.
	// TODO: Request policy during popup.
	getApiData(bounds).then(data => {
		console.log("Parsing debug API data to render to map.");

		// Iterate through each features geometry set.
		data.forEach(feature => {

			// Debug
			console.log(feature);

			// TODO: Load GeoJson instead?
			// map.data.addGeoJson(feature);
			var geometry = feature.geometry.coordinates;
			var polygonPaths = [];
			if (feature.geometry.type == "Polygon") {
				polygonPaths = getPolygonPaths(geometry)
			}
			else {
				geometry.forEach(polygon => {
					polygonPaths.push(getPolygonPaths(polygon))
				});
			}

			// Construct the polygon.
			const polygonArea = new google.maps.Polygon({
				paths: polygonPaths,
				strokeColor: "#F58672",
				strokeOpacity: 1.0,
				strokeWeight: 2,
				fillColor: "#F58672",
				fillOpacity: 0.25,
				data: {
					"Name": feature.nameEng,
					"Designation": feature.designationEng,
					"Description": feature.policy.landAreaDescrEng,
					"Intent": feature.policy.landUseIntentDescrEng,
				}
			});
			polygonArea.setMap(map);

			// Attach a listeners.
			google.maps.event.addListener(polygonArea, "mouseover", function () {
				this.setOptions({ fillOpacity: 0.50 });
				console.log(this.data);
			});

			google.maps.event.addListener(polygonArea, "mouseout", function () {
				this.setOptions({ fillOpacity: 0.25 });
			});

			console.log(`Created polygon(s) for: [${feature.ogfId}] - ${feature.nameEng} (${feature.designationEng})`);
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

	// Add search control.
	const searchControlDiv = document.createElement("div");
	SearchControl(searchControlDiv, map)
	map.controls[google.maps.ControlPosition.RIGHT_TOP].push(searchControlDiv);

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

// // Function to handle the credential response for Google sign in.
// function handleCredentialResponse(response) {

// 	// Decode the credential response.
// 	const responsePayload = decodeJwtResponse(response.credential);

// 	console.log("ID: " + responsePayload.sub);
// 	console.log('Full Name: ' + responsePayload.name);
// 	console.log('Given Name: ' + responsePayload.given_name);
// 	console.log('Family Name: ' + responsePayload.family_name);
// 	console.log("Image URL: " + responsePayload.picture);
// 	console.log("Email: " + responsePayload.email);

// 	// TODO: Determine if logon is successful and call this pageload.
// 	// TODO: Handle restricting users.
// 	//window.location.href = "../public/map.html";
// }

// // Function to decode JWT response.
// function decodeJwtResponse(token) {
// 	var tokens = token.split(".");
// 	return JSON.parse(atob(tokens[1]));
// };