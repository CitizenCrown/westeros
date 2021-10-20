// Function to request a list of object id's from the government Ontario website.
async function getObjectIds(){
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
async function getData(objectIds){
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

// This example creates simple polygons representing crown land in Ontario.
function initMap() {
	const map = new google.maps.Map(document.getElementById("map"), {
    zoom: 4,
    center: { lat: 49.000, lng: -80.000},
    mapTypeId: "terrain",
  });
	console.log("Initializing map.");
  
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
						paths[group_index][region_index] = { lng: region[0], lat: region[1]};
					})
				})
				console.log(`Created paths for: [${feature.attributes.OBJECTID}] ${feature.attributes.NAME_ENG} (${feature.attributes.DESIGNATION_ENG})`);
				
				// Construct the polygon.
				const polygonArea = new google.maps.Polygon({
					paths: paths,
					strokeColor: "#FF0000",
					strokeOpacity: 0.8,
					strokeWeight: 2,
					fillColor: "#FF0000",
					fillOpacity: 0.35,
				});
				
				polygonArea.setMap(map);
				console.log(`Created polygon(s) for: [${feature.attributes.OBJECTID}] ${feature.attributes.NAME_ENG} (${feature.attributes.DESIGNATION_ENG})`);
			})
		});
  });
}
