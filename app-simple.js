/* SIMPLE TEST VERSION */
console.log('🔥 Simple App Loading...');

window.App = {
  selectMode: function(mode) {
    console.log('✅ selectMode called:', mode);
    alert('Mode selected: ' + mode);
  },
  
  toggleSound: function() {
    console.log('✅ toggleSound called');
    alert('Sound toggled!');
  },
  
  toggleDrum: function() {
    console.log('✅ toggleDrum called');
    alert('Drum toggled!');
  },
  
  showSettings: function() {
    console.log('✅ showSettings called');
    alert('Settings opened!');
  }
};

console.log('✅ Simple App Loaded!');
console.log('📦 App object:', window.App);
