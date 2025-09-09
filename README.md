# 🎄 Christmas Gift Exchange App

A modern React TypeScript application for organizing Christmas gift exchanges with beautiful animations and Christmas theming.

## ✨ Features

- **Loading Screen**: Displays interesting Christmas facts while initializing
- **User Authentication**: Password-protected user identification with local storage
- **Gift Box Selection**: Interactive animated gift box selection interface
- **Wishes Management**: Write and manage your Christmas wishes
- **Christmas Animations**: Snowfall effects, glowing elements, and smooth transitions
- **Responsive Design**: Works on desktop and mobile devices
- **Data Persistence**: Saves data to external API with local storage for user preferences

## 🚀 Technologies Used

- **React 18** with TypeScript
- **Framer Motion** for animations
- **TailwindCSS** for styling
- **Lucide React** for icons
- **JSONBin.io** for data persistence

## 📱 User Flow

1. **Loading Screen**: Shows Christmas facts while app initializes
2. **Login**: User selects their name and optionally sets/enters password
3. **Gift Selection**: Choose from available gift boxes (each represents a person)
4. **Wishes**: Write and save Christmas wishes for their Secret Santa

## 🛠️ Development

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation
```bash
npm install
```

### Running the App
```bash
npm start
```

### Building for Production
```bash
npm run build
```

## 🎁 How It Works

1. **Data Structure**: The app uses the same data structure as the original Angular app:
   - `names`: Available participants and who they can pick
   - `taken`: Already selected name assignments
   - `gifts`: User wishes/gift requests
   - `passwords`: Optional password protection

2. **User Flow Logic**:
   - If user has localStorage data and already picked someone → go to wishes screen
   - If user exists but hasn't picked → go to selection screen  
   - Otherwise → go to login screen

3. **Password Protection**: Users can optionally set passwords to protect their wishes

## 🎨 Design Features

- **Christmas Theming**: Red, green, and gold color scheme
- **Animated Backgrounds**: Falling snowflakes on all screens
- **Glass Morphism**: Translucent panels with backdrop blur
- **Smooth Transitions**: Framer Motion animations between screens
- **Interactive Elements**: Hover effects, loading states, and micro-interactions

## 🔧 Configuration

The app connects to the same JSONBin.io endpoint as the original Angular version. The API configuration is in `src/services/api.ts`.

## 📝 Notes

This React version maintains the same core functionality as the original Angular app while adding enhanced Christmas theming, animations, and a more modern user interface.

---

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!