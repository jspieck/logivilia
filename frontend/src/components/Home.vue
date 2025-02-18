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
      <div class="hero-buttons">
        <button class="cta-button" @click="$router.push('/nonogram-overview')">
          <ion-icon name="play-outline"></ion-icon>
          Jetzt Rätseln
        </button>
      </div>
    </div>
  </div>

  <!-- Puzzle Types Section -->
  <div class="puzzle-types">
    <div class="puzzle-card">
      <div class="card-header">
        <div class="header-icon">
          <ion-icon name="grid-outline"></ion-icon>
        </div>
        <h2 class="card-title">Logikrätsel</h2>
      </div>
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
        <button class="puzzle-button" @click="$router.push('/logical-overview')">
          <span>Ausprobieren</span>
          <ion-icon name="arrow-forward-outline"></ion-icon>
        </button>
      </div>
    </div>

    <div class="puzzle-card">
      <div class="card-header">
        <div class="header-icon">
          <ion-icon name="apps-outline"></ion-icon>
        </div>
        <h2 class="card-title">Nonogramme</h2>
      </div>
      <div class="card-content">
        <img class="puzzle-image" src="../assets/nonoExample.png" alt="Nonogram example"/>
        <p class="card-description">
          Entdecken Sie die Kunst der Nonogramme - Logische Bilderrätsel, die Ihre Fähigkeiten herausfordern.
        </p>
        <button class="puzzle-button" @click="$router.push('/nonogram-overview')">
          <span>Ausprobieren</span>
          <ion-icon name="arrow-forward-outline"></ion-icon>
        </button>
      </div>
    </div>

    <div class="puzzle-card">
      <div class="card-header">
        <div class="header-icon">
          <ion-icon name="git-network-outline"></ion-icon>
        </div>
        <h2 class="card-title">Linelogs</h2>
      </div>
      <div class="card-content">
        <img class="puzzle-image" src="../assets/linelogExample.png" alt="Linelog example"/>
        <p class="card-description">
          Verbinden Sie die Punkte nach logischen Regeln - Ein faszinierendes Rätsel für Musterdenker.
        </p>
        <button class="puzzle-button" @click="$router.push('/linelog-overview')">
          <span>Ausprobieren</span>
          <ion-icon name="arrow-forward-outline"></ion-icon>
        </button>
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
  height: 300px;
  display: flex;
  align-items: center;
  padding: 20px 10%;
  margin-bottom: 48px;
}

.hero-content {
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
}

.hero-title {
  font-size: 3.5rem;
  color: #1a1a1a;
  margin-bottom: 1.5rem;
  line-height: 1.2;

  .highlight {
    color: #2196F3;
    display: block;
    font-weight: 700;
  }
}

.hero-subtitle {
  font-size: 1.5rem;
  color: #666;
  margin-bottom: 2rem;
  line-height: 1.5;
}

.cta-button {
  padding: 16px 32px;
  font-size: 1.2rem;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);

  &:hover {
    background: #1976D2;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(33, 150, 243, 0.4);
  }

  ion-icon {
    font-size: 20px;
  }
}

.puzzle-types {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px 48px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
}

.puzzle-card {
  background: white;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  border: 1px solid rgba(0, 0, 0, 0.08);

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
  }
}

.card-header {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);

  .header-icon {
    background: white;
    width: 48px;
    height: 48px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);

    ion-icon {
      font-size: 24px;
      color: #2196F3;
    }
  }
}

.card-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
}

.card-content {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.puzzle-image {
  width: 100%;
  height: auto;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  padding: 15px;
}

.card-description {
  color: #666;
  line-height: 1.6;
  margin: 0;
}

.logical-preview {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 16px;

  .preview-text {
    margin-bottom: 16px;
    color: #1a1a1a;
  }

  .preview-question {
    margin-bottom: 20px;
    color: #2196F3;
  }

  .preview-hints {
    h3 {
      color: #1a1a1a;
      margin-bottom: 12px;
      font-size: 16px;
    }

    ol {
      padding-left: 20px;
      
      li {
        margin-bottom: 8px;
        color: #666;
      }
    }
  }
}

.puzzle-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  background: transparent;
  color: #2196F3;
  border: 2px solid #2196F3;
  border-radius: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #2196F3;
    color: white;
    transform: translateX(4px);
  }

  ion-icon {
    font-size: 18px;
  }
}

@media (max-width: 1200px) {
  .puzzle-types {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }

  .hero-subtitle {
    font-size: 1.2rem;
  }

  .puzzle-types {
    grid-template-columns: 1fr;
    padding: 0 12px 32px;
  }
}
</style>
