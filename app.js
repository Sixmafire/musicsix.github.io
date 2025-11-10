// Script simple para alternar el icono de chevron al abrir/cerrar los detalles
document.addEventListener('DOMContentLoaded', () => {
    const details = document.querySelector('details');
    if (details) {
        const summaryIcon = details.querySelector('.material-symbols-outlined');
        details.addEventListener('toggle', () => {
            if (details.open) {
                summaryIcon.classList.add('rotate-90');
            } else {
                summaryIcon.classList.remove('rotate-90');
            }
        });
    }
});


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
    const IMAGE_HEIGHT = 150; // Altura de referencia del reel (CRÍTICO para el cálculo)

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
    const buttonContainers = [
        document.getElementById('button-1-container'),
        document.getElementById('button-2-container'),
        document.getElementById('button-3-container'),
        document.getElementById('button-4-container'),
    ];
    const spinButton = document.getElementById('spin-button');
    const playAllButton = document.getElementById('play-all-button');
    const messageDisplay = document.getElementById('message');

    // --- FUNCIONES DE VISTA (Manipulación de la interfaz) ---

    function playSound(soundObject) {
        soundObject.currentTime = 0;
        soundObject.play().catch(e => console.error("Error al reproducir el sonido:", e)); 
    }
    
    function playPatternSound(patternIndex, buttonElement = null) {
        // 1. Detener todos los sonidos antes de reproducir uno nuevo
        Object.values(Model.soundsMap).forEach(sound => {
            if (!sound.paused && typeof sound.pause === 'function') {
                sound.pause();
                sound.currentTime = 0;
            }
        });

        const sound = Model.soundsMap[patternIndex];
        if (sound) {
            playSound(sound);

            // 2. Aplicar el efecto visual si se proporcionó un botón
            if (buttonElement) {
                buttonElement.classList.add('active-play');
                
                // 3. Remover el efecto después de un tiempo corto
                setTimeout(() => {
                    buttonElement.classList.remove('active-play');
                }, 600); 
            }
        }
    }

    function highlightReel(reelElement, duration) {
        // Resaltamos el contenedor de la imagen
        reelElement.classList.add('highlight');
        
        // También resaltamos el botón asociado
        const reelIndex = reels.indexOf(reelElement);
        if (reelIndex !== -1) {
            const buttonContainer = buttonContainers[reelIndex];
            if (buttonContainer) {
                const button = buttonContainer.querySelector('button');
                if (button) {
                    button.classList.add('highlight');
                    setTimeout(() => {
                        button.classList.remove('highlight');
                    }, duration);
                }
            }
        }
        
        setTimeout(() => {
             reelElement.classList.remove('highlight');
        }, duration);
    }
    
    function initializeReel(reelContainer) {
        
        // Aseguramos que el contenedor tenga la clase de giro y limpiamos el contenido
        reelContainer.classList.add('reel-container');
        reelContainer.classList.remove('flex', 'items-center', 'justify-center');
        reelContainer.innerHTML = '<div class="reel"></div>';
        
        const reelElement = reelContainer.querySelector('.reel');
        let computedImageHeight = Model.IMAGE_HEIGHT;

        // Agrega múltiples copias de las imágenes para el efecto de giro (5 ciclos)
        for (let i = 0; i < Model.TOTAL_ITEMS * 5; i++) {
            const index = i % Model.TOTAL_ITEMS;
            const img = document.createElement('img');
            img.src = Model.IMAGE_DIR + Model.patterns[index];
            img.alt = Model.patternNames[index]; 
            img.dataset.patternIndex = index;
            reelElement.appendChild(img);
        }
        
        // Posicionamiento inicial: para que el giro comience fuera del viewport
        const initialPosition = - (Model.TOTAL_ITEMS * computedImageHeight);
        
        reelElement.style.transition = 'none'; 
        reelElement.style.transform = `translateY(${initialPosition}px)`;
        
        return { reelElement, computedImageHeight }; // Devuelve el elemento y la altura
    }


    function createFinalView(reelContainer, index, patternIndex) {
        
        // El contenedor del botón correspondiente a este reel
        const buttonContainer = buttonContainers[index];
        
        // 1. LIMPIAR Y PREPARAR EL CONTENEDOR DEL REEL (IMAGEN)
        reelContainer.innerHTML = ''; 
        
        // Quitamos la clase de giro y añadimos las de la vista final
        reelContainer.classList.remove('reel-container');
        reelContainer.classList.add('flex', 'items-center', 'justify-center');

        // Imagen final
        const img = document.createElement('img');
        img.src = Model.IMAGE_DIR + Model.patterns[patternIndex];
        img.alt = Model.patternNames[patternIndex]; 
        img.id = `result-reel${index}-${patternIndex}`; 
        img.dataset.patternIndex = patternIndex; 
        img.className = 'w-full h-full object-contain p-2';
        
        reelContainer.appendChild(img);
        
        // 2. CREAR Y AÑADIR EL BOTÓN AL CONTENEDOR EXTERNO
        buttonContainer.innerHTML = ''; // Limpiamos el contenedor del botón
        
        const playButton = document.createElement('button');
        playButton.innerHTML = `<span class="material-symbols-outlined" style="font-size: 1.25em;">hearing</span>Escuchar`; 
        playButton.className = 'play-pattern-button text-xs sm:text-sm py-1 px-2 rounded-md flex items-center justify-center gap-1 w-full'; 
        
        // Añadimos el listener y pasamos el botón para la iluminación
        playButton.addEventListener('click', (e) => {
            e.stopPropagation(); 
            playPatternSound(patternIndex, playButton);
        });

        buttonContainer.appendChild(playButton);

        // Limpiamos las propiedades de transición del giro
        reelContainer.style.transition = 'none'; 
        reelContainer.style.transform = `translateY(0px)`;
    }
    
    function updateMessage(message) {
        messageDisplay.innerHTML = message;
    }
    
    function disableButtons(status) {
        spinButton.disabled = status;
        playAllButton.disabled = status;
        
        // También deshabilitar/habilitar los botones de la guía
        document.querySelectorAll('.rhythm-content .play-small-button').forEach(button => {
            button.disabled = status;
        });
        // Deshabilitar/habilitar los nuevos botones de escucha
        buttonContainers.forEach(container => {
             const button = container.querySelector('button');
             if (button) button.disabled = status;
        });
    }

    // --- LÓGICA DEL CONTROLADOR (Manejo de flujo y eventos) ---

    function spinReel(reelIndex) {
        return new Promise((resolve) => {
            const reelContainer = reels[reelIndex];
            
            // 1. Limpiar el contenedor del botón
            buttonContainers[reelIndex].innerHTML = ''; 

            // 2. Inicializar y obtener el objeto con el elemento y la altura.
            const { reelElement: reel, computedImageHeight } = initializeReel(reelContainer); 
            
            const winningIndex = Model.getRandomPatternIndex();

            // CÁLCULO DE POSICIÓN FINAL:
            const totalCycles = 4; // Aseguramos 4 ciclos de 9 imágenes
            const finalSpinPosition = -(
                 (Model.TOTAL_ITEMS * computedImageHeight * totalCycles) 
                 + (winningIndex * computedImageHeight) 
            );

            // 3. CRÍTICO: Forzar el Reflow. Esto asegura que la posición inicial 
            //    (fuera de vista) sea dibujada antes de aplicar la transición.
            reel.offsetHeight; 

            // 4. Aplicar la Transición y la Posición Final (¡El giro!)
            reel.style.transition = `transform ${Model.SPIN_DURATION_MS / 1000}s cubic-bezier(0.1, 0.7, 0.4, 1)`; // Curva de desaceleración
            reel.style.transform = `translateY(${finalSpinPosition}px)`;

            setTimeout(() => {
                resolve(winningIndex); 
            }, Model.SPIN_DURATION_MS); 
        });
    }

    async function startSpin() {
        disableButtons(true);
        updateMessage('¡Girando...! 🥁');
        
        // Ejecutamos el giro en paralelo
        const winningPatternIndexes = await Promise.all([
            spinReel(0), spinReel(1), spinReel(2), spinReel(3)
        ]);
        
        Model.setWinningIndexes(winningPatternIndexes); 
        updateMessage(`¡Stop!`);
        
        // Mostramos la vista final con la imagen y el botón de escuchar
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
            
            // Resaltar el contenedor del reel y el botón.
            highlightReel(reelElement, Model.TEMPO_MS); 
            
            // Reproducir el tic y el patrón simultáneamente
            playSound(Model.metronomeTic); 
            playPatternSound(patternIndex); 
            
            await new Promise(r => setTimeout(r, Model.TEMPO_MS));
        }
        
        updateMessage(`¡Listo! Pulsa "GIRAR" o "Solfeo Rítmico" de nuevo.`);
        disableButtons(false);
    }
    
    function setupRhythmGuideListeners() {
        document.querySelectorAll('.rhythm-content .play-small-button').forEach(button => {
            button.addEventListener('click', (event) => {
                const patternIndex = parseInt(event.currentTarget.dataset.patternIndex);
                // Pasamos el botón a la función para la iluminación
                playPatternSound(patternIndex, event.currentTarget);
            });
        });
    }

    // --- INICIALIZACIÓN ---
    spinButton.addEventListener('click', startSpin);
    playAllButton.addEventListener('click', startSequentialPlay);

    // Inicialización de la guía rítmica y los reels de resultado
    setupRhythmGuideListeners();
    
    // Inicializa los reels en la vista final (con el patrón 0 por defecto) antes del primer giro
    Model.currentWinningIndexes().forEach((patternIndex, index) => {
        createFinalView(reels[index], index, patternIndex); 
    });
});
