// On a device the global FormData is React Native's, which takes file parts as
// { uri, name, type }. Jest's is Node's — and axios captures whichever one is
// global when it loads — so install RN's before any test module imports axios.
global.FormData = require('react-native/Libraries/Network/FormData')
