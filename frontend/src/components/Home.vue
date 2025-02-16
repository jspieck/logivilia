<template>
<div class="homeScreen">
  <!-- Hero Section -->
  <div class="hero">
    <div class="hero-content">
      <h1 class="hero-title">
        Zeit für Ihre
        <span class="highlight">Geistige Fitness</span>
      </h1>
      <p class="hero-subtitle">Lösen Sie kostenlos eine Auswahl an abwechslungsreichen Logikrätseln</p>
      <button class="secondary-button" @click="$router.push('/nonogram')">Jetzt Rätseln</button>
    </div>
  </div>

  <!-- Puzzle Types Section -->
  <div class="puzzle-types">
    <div class="puzzle-card">
      <h2 class="card-title">Nonogramme</h2>
      <div class="card-content">
        <img class="puzzle-image" src="../assets/nonoExample.png" alt="Nonogram example"/>
        <p class="card-description">
          Entdecken Sie die Kunst der Nonogramme - Logische Bilderrätsel, die Ihre Fähigkeiten herausfordern.
        </p>
        <button class="secondary-button" @click="$router.push('/nonogram')">Ausprobieren</button>
      </div>
    </div>

    <div class="puzzle-card">
      <h2 class="card-title">Logicals</h2>
      <div class="card-content">
        <div class="logical-preview">
          <p class="preview-text">Frau Velan züchtet verschiedenfarbige Zwergpudel.</p>
          <div class="preview-question">
            <strong>Welcher Zwergpudel (Name) besitzt welche Fellfarbe?</strong>
          </div>
          <div class="preview-hints">
            <h3>Hinweise</h3>
            <ol>
              <li>Der Zwergpudel namens Bello hat kein rotes Fell.</li>
              <li>Der blaue Pudel hat einen Namen, der länger ist als der des gelben Pudels.</li>
              <li>Die Farbmischung von Bellos und Ivonnes Fellfarbe ergibt nicht orange.</li>
            </ol>
          </div>
        </div>
        <button class="secondary-button" @click="$router.push('/logical')">Ausprobieren</button>
      </div>
    </div>
  </div>
</div>
</template>

<script>

export default {
  name: 'Home',
  setup() {
    return {
    };
  }
};
</script>

<style lang="scss" scoped>
.homeScreen {
  width: 100%;
  background: #f8f9fa;
}

.hero {
  width: 100%;
  height: 350px;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  padding: 0 10%;
}

.hero-content {
  max-width: 600px;
}

.hero-title {
  font-size: 3.5rem;
  color: #2c3e50;
  margin-top: 2rem;
  margin-bottom: 1rem;
  line-height: 1.2;

  .highlight {
    color: #3498db;
    display: block;
    font-weight: 700;
  }
}

.hero-subtitle {
  font-size: 1.5rem;
  color: #34495e;
  margin-bottom: 2rem;
  line-height: 1.5;
}

.cta-button {
  padding: 1rem 2rem;
  font-size: 1.2rem;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s, background 0.2s;

  &:hover {
    background: #2980b9;
    transform: translateY(-2px);
  }
}

.puzzle-types {
  padding: 1rem 5%;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.puzzle-card {
  background: #f4f4f4;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.card-title {
  color: #2c3e50;
  font-size: 1.8rem;
  margin-bottom: 1.5rem;
  text-align: center;
}

.card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.puzzle-image {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
}

.card-description {
  color: #34495e;
  text-align: center;
  line-height: 1.6;
}

.secondary-button {
  padding: 0.8rem 1.5rem;
  background: #f8f9fa;
  color: #3498db;
  border: 2px solid #3498db;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  height: 40px;
  line-height: 0px;

  &:hover {
    background: #3498db;
    color: white;
  }
}

.logical-preview {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  width: 100%;

  .preview-text {
    margin-bottom: 1rem;
  }

  .preview-question {
    margin-bottom: 1.5rem;
    color: #2c3e50;
  }

  .preview-hints {
    h3 {
      color: #2c3e50;
      margin-bottom: 0.8rem;
    }

    ol {
      padding-left: 1.2rem;
      
      li {
        margin-bottom: 0.5rem;
        color: #34495e;
      }
    }
  }
}

@media (max-width: 768px) {
  .hero {
    padding: 0 5%;
    text-align: center;
  }

  .hero-title {
    font-size: 2.5rem;
  }

  .hero-subtitle {
    font-size: 1.2rem;
  }

  .puzzle-types {
    padding: 2rem 5%;
  }
}
</style>
