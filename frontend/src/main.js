//載入createApp函式
import {createApp} from "vue";

//載入根組件
import App from "./App.vue";

//建立vue app物件
const app = createApp(App);

//掛載到HTML標籤
app.mount("#app");