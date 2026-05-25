const fs = require('fs');

const createPlaceholder = (name, text, color) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <rect width="800" height="600" fill="${color}" />
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="48" fill="#ffffff">${text}</text>
  </svg>`;
  fs.writeFileSync(`/home/elvin/Projects/businesses/kenya_airways_254/public/images/${name}.svg`, svg);
};

createPlaceholder('dest_mombasa', 'Mombasa', '#002b5c');
createPlaceholder('dest_zanzibar', 'Zanzibar', '#bb0013');
createPlaceholder('dest_capetown', 'Cape Town', '#002b5c');
createPlaceholder('dest_dubai', 'Dubai', '#a33c33');
createPlaceholder('dest_london', 'London', '#002b5c');
createPlaceholder('dest_paris', 'Paris', '#bb0013');
createPlaceholder('fleet_dreamliner', 'Boeing 787 Dreamliner', '#002b5c');
createPlaceholder('auth_travel', 'Kenya Airways Experience', '#bb0013');
createPlaceholder('avatar_1', 'JD', '#002b5c');
createPlaceholder('avatar_2', 'AS', '#bb0013');
createPlaceholder('avatar_3', 'MK', '#a33c33');

console.log('Placeholders generated successfully.');
