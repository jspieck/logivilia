<template>
<div class="homeScreen">
  <div class="imgCard">
    <div class="websiteText">
      <p class="cardTitle">Zeit für Ihre</p>
      <p class="cardTitle"><strong>Geistige Fitness</strong></p>
      <p class="subline">Lösen Sie kostenlos eine Auswahl an abwechslungsreichen Logikrätseln</p>
    </div>
  </div>
  <div>
    <div class="subtile">
      <h2 class="tileHeadline">Nonogramme</h2>
      <div id="puzzle" class="puzzleBody">
        <img class="subimg" width="300" src="../assets/nonoExample.png"/>
      </div>
    </div>
    <div class="subtile">
      <h2 class="tileHeadline">Logicals</h2>
      <div id="puzzle" class="puzzleBody">
        <p id="description">Frau Velan züchtet verschiedenfarbige Zwergpudel.</p>
        <label class="logicalQuestion"><strong> Welcher Zwergpudel (Name) besitzt welche Fellfarbe?</strong></label>
        <h3>Hinweise</h3>
        <ol id="clues">
          <li>Der Zwergpudel namens Bello hat kein rotes Fell.</li>
          <li>Der blaue Pudel hat einen Namen, der länger ist als der des gelben Pudels.</li>
          <li>Die Farbmischung von Bellos und Ivonnes Fellfarbe ergibt nicht orange.</li>
        </ol>
        <label class="bold">Attribute</label>
        <ul id="attrList">
          <li>
            <div class="attrRow">
              <strong>Namen:</strong>
              <span> Bello, Ivonne, Zacharias</span>
            </div>
          </li>
          <li>
            <div class="attrRow">
              <strong>Farben:</strong>
              <span> Blaue, Gelb, Rot</span>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</div>
</template>

<script>

export default {
  name: 'Home',
  data() {
    return {
    };
  },
  computed: {

  },
  methods: {
  }
};
</script>

<style lang="scss">
.imgCard {
  width: 100%;
  height: 500px;
  background: url("../assets/desk.jpg");
  background-size: cover;
  position: relative;
}
.websiteText {
  margin-top: 50px;
  margin-left: 50px;
  position: absolute;
  left: 50px;
  top: 50px;
}
.cardTitle {
  font-size: 32px;
  margin-top: 0;
  margin-bottom: 15px;
}
.subline {
  width: 287px;
  font-size: 18px;
  margin-top: 34px;
  line-height: 28px;
}
.tileHeadline {
  width: 100%;
  text-align: center;
}
.subtile {
  padding: 20px;
  width: 49%;
  display: inline-block;
  box-sizing: border-box;
  vertical-align: top;
  height: 450px;
  box-sizing: border-box;
}
.subimg {
  margin: auto;
  width: 300px;
  display: block;
}
.subtile .puzzleBody {
  height: 375px;
  background: none;
  box-shadow: none;
}
.bodyContainer {
  height: 100%;
}
.homeScreen {
  height: 100%;
  background: #ffffffab;
}
</style>
