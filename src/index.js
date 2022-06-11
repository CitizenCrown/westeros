// Function to request a list of object id's from the government Ontario website.
async function getObjectIds() {
	let response = await fetch('https://ws.lioservices.lrc.gov.on.ca/arcgis1071a/rest/services/LIO_OPEN_DATA/LIO_Open06/MapServer/5/query?' + new URLSearchParams({
		f: 'json',
		outSR: '4326',
		returnIdsOnly: true,
		where: '1=1'
	}));
	let data = await response.json()

	// Too much data. Return a chunk for now.
	console.log(`Total object id's found: ${data.objectIds.length}`);
	return data.objectIds.slice(0, 50);
}

// Function to request specific object data from the government Ontario website.
async function getData(objectIds) {
	let response = await fetch('https://ws.lioservices.lrc.gov.on.ca/arcgis1071a/rest/services/LIO_OPEN_DATA/LIO_Open06/MapServer/5/query?' + new URLSearchParams({
		f: 'json',
		outSR: '4326',
		objectIds: objectIds,
		outFields: ["*"],
		returnGeometry: true,
		where: '1=1'
	}));
	let data = await response.json()
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
	console.log("Add marker finished.");
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

	// Focus map position Ontario.
	const geocoder = new google.maps.Geocoder();
	geocoder
		.geocode({ address: "Ontario" })
		.then((response) => {
			const position = response.results[0].geometry.location;
			map.setCenter(position);
			console.log("Map centered on Ontario.");
		})
		.catch((e) =>
			window.alert("Geocode was not successful for the following reason: " + e)
		);

	// Setup Geolocation.
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
			}
		);
	}
	else {

	}

	// Get a list of object id's.
	getObjectIds().then(ids => {
		console.log(`Fetched ids: ${ids}`);

		// Get data and log it to console.
		getData(ids.toString()).then(data => {
			console.log(`Fetched ${ids.length} data objects.`);
			console.debug(data);

			// Iterate through each features geometry set.
			data.features.forEach(feature => {

				// Create coord paths for map.
				var rings = feature.geometry.rings;
				var paths = new Array(rings.length);
				rings.forEach((group, group_index) => {
					paths[group_index] = new Array(group.length);
					group.forEach((region, region_index) => {
						paths[group_index][region_index] = { lng: region[0], lat: region[1] };
					})
				})
				console.log(`Created paths for: [${feature.attributes.OBJECTID}] ${feature.attributes.NAME_ENG} (${feature.attributes.DESIGNATION_ENG})`);

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
				console.log(`Created polygon(s) for: [${feature.attributes.OBJECTID}] ${feature.attributes.NAME_ENG} (${feature.attributes.DESIGNATION_ENG})`);
			})
		});
	});
}
