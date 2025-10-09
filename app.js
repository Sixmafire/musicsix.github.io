// --- MODELO: DATOS y ESTADO ---
const Model = (function() {
    const TEMPO_MS = 750; 
    const COUNTDOWN_BEATS = 4;
    const IMAGE_DIR = 'images/'; // Ruta a la carpeta de imágenes
    const SOUND_DIR = 'sounds/'; // Ruta a la carpeta de sonidos

    const patterns = [
        '00.png', '01.png', '02.png', '03.png', '04.png', 
        '05.png', '06.png', '07.png', '08.png'  
    ];
    
    const patternNames = [
        'Dos Corcheas', 'Corchea con Puntillo y Semicorchea', 'Dos Semicorcheas y Corchea', 'Semicorchea y Corchea con Puntillo', 
        'Semicorchea, Corchea y Semicorchea', 'Cuatro Semicorcheas', 'Tresillo de Corcheas', 
        'Corchea y Dos Semicorcheas', 'Negra' 
    ];
    
    // Mapeo de objetos Audio para precarga y fácil acceso
    const soundsMap = {
        0: new Audio(`${SOUND_DIR}s_00.mp3`), 1: new Audio(`${SOUND_DIR}s_01.mp3`), 
        2: new Audio(`${SOUND_DIR}s_02.mp3`), 3: new Audio(`${SOUND_DIR}s_03.mp3`), 
        4: new Audio(`${SOUND_DIR}s_04.mp3`), 5: new Audio(`${SOUND_DIR}s_05.mp3`), 
        6: new Audio(`${SOUND_DIR}s_06.mp3`), 7: new Audio(`${SOUND_DIR}s_07.mp3`), 
        8: new Audio(`${SOUND_DIR}s_08.mp3`), 
    };
    
    const metronomeTic = new Audio(`${SOUND_DIR}metronome.mp3`); 

    const TOTAL_ITEMS = patterns.length; 
    const SPIN_DURATION_MS = 2000; 
    const SPIN_COUNT = 30; 
    const IMAGE_HEIGHT = 150; // Altura de referencia del reel

    let currentWinningIndexes = [0, 0, 0, 0]; // Estado actual de los patrones

    function getRandomPatternIndex() {
        return Math.floor(Math.random() * TOTAL_ITEMS);
    }

    function setWinningIndexes(indexes) {
        currentWinningIndexes = indexes;
    }
    
    return {
        TEMPO_MS,
        COUNTDOWN_BEATS,
        IMAGE_DIR,
        patterns,
        patternNames,
        soundsMap,
        metronomeTic,
        TOTAL_ITEMS,
        SPIN_DURATION_MS,
        SPIN_COUNT,
        IMAGE_HEIGHT,
        currentWinningIndexes: () => currentWinningIndexes, // Getter para el estado
        getRandomPatternIndex,
        setWinningIndexes,
    };
})();
// --- CONTROLADOR: INTERACCIÓN y MANIPULACIÓN DEL DOM ---
document.addEventListener('DOMContentLoaded', () => {
    // Referencias del DOM
    const reels = [
        document.getElementById('reel-1'),
        document.getElementById('reel-2'),
        document.getElementById('reel-3'),
        document.getElementById('reel-4')
    ];
    const spinButton = document.getElementById('spin-button');
    const playAllButton = document.getElementById('play-all-button');
    const messageDisplay = document.getElementById('message');

    // --- FUNCIONES DE VISTA (Manipulación de la interfaz) ---

    function playSound(soundObject) {
        soundObject.currentTime = 0;
        soundObject.play().catch(e => console.error("Error al reproducir el sonido:", e)); 
    }
    
    function playPatternSound(patternIndex) {
        // Detener todos los sonidos antes de reproducir uno nuevo (para evitar superposición)
        Object.values(Model.soundsMap).forEach(sound => {
            if (!sound.paused) {
                sound.pause();
                sound.currentTime = 0;
            }
        });
        const sound = Model.soundsMap[patternIndex];
        if (sound) {
            playSound(sound);
        }
    }

    function highlightReel(reelElement, duration) {
        reelElement.classList.add('highlight');
        setTimeout(() => {
            reelElement.classList.remove('highlight');
        }, duration);
    }
    
    function initializeReel(reelElement) {
        reelElement.innerHTML = ''; 
        for (let i = 0; i < Model.TOTAL_ITEMS * 5; i++) {
            const index = i % Model.TOTAL_ITEMS;
            const img = document.createElement('img');
            // Usamos la ruta de imagen definida en el Modelo
            img.src = Model.IMAGE_DIR + Model.patterns[index];
            img.alt = Model.patternNames[index]; 
            img.dataset.patternIndex = index;
            reelElement.appendChild(img);
        }
        
        // CÁLCULO PARA POSICIONAMIENTO INICIAL
        const computedReelHeight = reelElement.offsetHeight;
        // Asumiendo que la altura de la imagen es reelHeight - 40px (basado en CSS)
        const computedImageHeight = computedReelHeight - (40 * (computedReelHeight / Model.IMAGE_HEIGHT)); 
        
        const initialPosition = -((Model.TOTAL_ITEMS * computedImageHeight) + (computedReelHeight - computedImageHeight));
        
        reelElement.style.transition = 'none'; 
        reelElement.style.transform = `translateY(${initialPosition}px)`;
    }

    function createFinalView(reel, index, patternIndex) {
        reel.innerHTML = ''; 
        
        // Botón de reproducción
        const playButton = document.createElement('button');
        playButton.textContent = '▶️ Escuchar'; 
        playButton.className = 'play-pattern-button'; 
        playButton.addEventListener('click', () => {
            playPatternSound(patternIndex);
        });

        // Imagen final
        const img = document.createElement('img');
        img.src = Model.IMAGE_DIR + Model.patterns[patternIndex];
        img.alt = Model.patternNames[patternIndex]; 
        img.id = `result-reel${index}-${patternIndex}`; 
        img.dataset.patternIndex = patternIndex; 

        reel.appendChild(playButton);
        reel.appendChild(img);
        
        // Resetear la transición y posición final
        reel.style.transition = 'none'; 
        reel.style.transform = `translateY(0px)`;
    }
    
    function updateMessage(message) {
        messageDisplay.innerHTML = message;
    }
    
    function disableButtons(status) {
        spinButton.disabled = status;
        playAllButton.disabled = status;
    }

    // --- LÓGICA DEL CONTROLADOR (Manejo de flujo y eventos) ---

    function spinReel(reelIndex) {
        return new Promise((resolve) => {
            const reel = reels[reelIndex];
            const winningIndex = Model.getRandomPatternIndex(); // Obtiene el índice ganador del Modelo

            const computedReelHeight = reel.offsetHeight;
            const computedImageHeight = reel.querySelector('img') ? reel.querySelector('img').offsetHeight : Model.IMAGE_HEIGHT;

            // Se calcula la posición final para detenerse en el índice ganador
            const finalPosition = -((Model.SPIN_COUNT * computedImageHeight) + (winningIndex * computedImageHeight));

            reel.style.transition = `transform ${Model.SPIN_DURATION_MS / 1000}s ease-out`;
            reel.style.transform = `translateY(${finalPosition}px)`;

            setTimeout(() => {
                resolve(winningIndex); 
            }, Model.SPIN_DURATION_MS); 
        });
    }

    async function startSpin() {
        disableButtons(true);
        updateMessage('¡Girando...! 🥁');
        reels.forEach(initializeReel); 
        await new Promise(r => setTimeout(r, 50)); 
        
        const winningPatternIndexes = await Promise.all([
            spinReel(0), spinReel(1), spinReel(2), spinReel(3)
        ]);
        
        Model.setWinningIndexes(winningPatternIndexes); // Actualiza el estado en el Modelo
        updateMessage(`¡Stop!`);
        
        Model.currentWinningIndexes().forEach((patternIndex, index) => {
            createFinalView(reels[index], index, patternIndex);
        });
        
        disableButtons(false);
    }
    
    async function startSequentialPlay() {
        disableButtons(true);

        // Cuenta regresiva
        for (let i = 1; i <= Model.COUNTDOWN_BEATS; i++) {
            updateMessage(`🎵 **Contando... ${i}**`);
            playSound(Model.metronomeTic); 
            await new Promise(r => setTimeout(r, Model.TEMPO_MS));
        }

        // Reproducción de patrones
        updateMessage("🎶 **¡Solfeo Rítmico!**");
        const currentIndexes = Model.currentWinningIndexes();
        for (let i = 0; i < currentIndexes.length; i++) {
            const patternIndex = currentIndexes[i];
            const reelElement = reels[i];
            
            playSound(Model.metronomeTic); 
            highlightReel(reelElement, Model.TEMPO_MS); 
            playPatternSound(patternIndex); 
            
            await new Promise(r => setTimeout(r, Model.TEMPO_MS));
        }
        
        updateMessage(`¡Stop!`);
        disableButtons(false);
    }
    
    function setupRhythmGuideListeners() {
        document.querySelectorAll('.rhythm-content .play-small-button').forEach(button => {
            button.addEventListener('click', (event) => {
                const patternIndex = parseInt(event.currentTarget.dataset.patternIndex);
                playPatternSound(patternIndex);
            });
        });
    }

    // --- INICIALIZACIÓN ---
    spinButton.addEventListener('click', startSpin);
    playAllButton.addEventListener('click', startSequentialPlay);

    // Inicialización de la guía rítmica y los reels de resultado
    setupRhythmGuideListeners();
    Model.currentWinningIndexes().forEach((patternIndex, index) => {
        createFinalView(reels[index], index, patternIndex); 
    });
});