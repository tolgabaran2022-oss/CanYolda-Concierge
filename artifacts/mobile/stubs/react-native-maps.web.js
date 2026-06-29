const React = require("react");
const { View, Text } = require("react-native");

const PROVIDER_DEFAULT = null;
const PROVIDER_GOOGLE = "google";

function MapView({ style, children }) {
  return React.createElement(
    View,
    {
      style: [
        { backgroundColor: "#e5e3df", alignItems: "center", justifyContent: "center" },
        style,
      ],
    },
    React.createElement(
      Text,
      { style: { color: "#8B7260", fontSize: 13, fontFamily: "sans-serif" } },
      "Harita (mobil uygulamada goruntulenir)"
    ),
    children
  );
}

function Marker() { return null; }
function Callout() { return null; }
function Polyline() { return null; }
function Polygon() { return null; }
function Circle() { return null; }

MapView.Marker = Marker;
MapView.Callout = Callout;

module.exports = MapView;
module.exports.default = MapView;
module.exports.MapView = MapView;
module.exports.Marker = Marker;
module.exports.Callout = Callout;
module.exports.Polyline = Polyline;
module.exports.Polygon = Polygon;
module.exports.Circle = Circle;
module.exports.PROVIDER_DEFAULT = PROVIDER_DEFAULT;
module.exports.PROVIDER_GOOGLE = PROVIDER_GOOGLE;
