import { layerControlSimple } from "./dist/mapbox-layer-control/layerControlSimple.js"
import { layerControlGrouped } from "./dist/mapbox-layer-control/layerControlGrouped.js"

const configUrl = "config.json"

// request config from configUrl
fetch(configUrl)
  .then(response => response.json())
  .then(config => {

    mapboxgl.accessToken = 'pk.eyJ1IjoiYWx4Z2lyYXJkMiIsImEiOiJjbGV4ZzAydGExODA1M3ZtazByNHMxOGg0In0.7s92oKW7fiNYgqZiG8nw4g';
    var map = new mapboxgl.Map({
      center: config.mapCenter,
      container: 'map',
      style: 'mapbox://styles/mapbox/dark-v9',
      zoom: 14
    });

    var setupIcons = function(map, icons) {
      Promise.all(
        icons.map(
          icon => new Promise((resolve, reject) => {
            const url = `./img/icons/mx_${icon}.png`;
            map.loadImage(url, function (error, res) {
              if (error) throw error;

              if(map.style.getImage(icon) === undefined) {
                map.addImage(icon, res, { 'sdf': true })
              }

              resolve();
            })
          })
        )).then(() => {})
    }

    var setupLayer = function(map, layer) {

      const name = layer['name'].replace('-layer', '')
      const gpxUrl = './gpx/' + name + '.gpx';

      map.addSource(name, {type: "geojson", data: {}});
      map.addLayer({
        'id': layer['name'],
        'source': name,
        'type': 'symbol',
        'metadata': {
          'legend': layer['legend'],
          'color': layer['color']
        },
        'paint': {
          'icon-color': layer['color']
        },
        'layout': {
          'visibility': layer['visibility'],
          // get the icon name from the source's "icon" property
          // concatenate the name to get an icon from the style's sprite sheet
          'icon-image': ['get', 'icon'],
          'icon-size': 0.7,
        }
      });

      // When a click event occurs on a feature in the places layer, open a popup at the
      // location of the feature, with description HTML from its properties.
      map.on('click', layer['name'], (e) => {
        // Copy coordinates array.
        const coordinates = e.features[0].geometry.coordinates.slice();
        const description = e.features[0].properties.name;

        // Ensure that if the map is zoomed out such that multiple
        // copies of the feature are visible, the popup appears
        // over the copy being pointed to.
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        new mapboxgl.Popup()
                    .setLngLat(coordinates)
                    .setHTML(description)
                    .addTo(map);
      });

      // Change the cursor to a pointer when the mouse is over the places layer.
      map.on('mouseenter', layer['name'], () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      // Change it back to a pointer when it leaves.
      map.on('mouseleave', layer['name'], () => {
        map.getCanvas().style.cursor = '';
      });

      // request content from gpxUrl
      fetch(gpxUrl)
        .then(response => response.text())
        .then(data => {

          const osmandIconRegex = /<osmand:icon>(.*?)<\/osmand:icon>/g;
          let match, icons = [];
          while ((match = osmandIconRegex.exec(data)) !== null) {
            icons.push(match[1]);
          }
          setupIcons(map, icons);

          const gpx = new gpxParser(); //Create gpxParser Object
          gpx.parse(data); //parse gpx file from string data
          const geoJson = gpx.toGeoJSON();

          console.log(geoJson)
          map.getSource(name).setData(geoJson)
        });

    }

    map.on('load', function() {

      const configUrl = "config.json"

      // request config from configUrl
      fetch(configUrl)
        .then(response => response.json())
        .then(config => {

          console.log(config)

          for(var i = 0; i < config.layers.length; i++) {
            setupLayer(map, config.layers[i]);
          }

          map.addControl(new mapboxgl.GeolocateControl());
          map.addControl( new layerControlSimple({
            layers: config.layers.map(function(layer) { return layer['name'] })
          }), "top-left");

        })
    });

  })
