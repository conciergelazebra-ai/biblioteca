// 1. Importar los módulos necesarios de Firebase desde internet (Versión estable)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Tu configuración real de Firebase (Con tus llaves reales)
const firebaseConfig = {
  apiKey: "secreto", 
  authDomain: "biblioteca-andante.firebaseapp.com",
  projectId: "biblioteca-andante",
  storageBucket: "biblioteca-andante.firebasestorage.app",
  messagingSenderId: "907474616559",
  appId: "1:907474616559:web:c1942ac42716a2a1d89b1a"
};

// Inicializar Firebase y Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let biblioteca = [];

// 2. Descargar los datos desde Firebase Firestore
async function cargarBibliotecaDesdeFirebase() {
    try {
        const querySnapshot = await getDocs(collection(db, "servicios"));
        biblioteca = [];
        
        querySnapshot.forEach((doc) => {
            biblioteca.push({ id: doc.id, ...doc.data() });
        });

        mostrarResultados(biblioteca);
    } catch (error) {
        console.error("Error descargando datos de Firebase:", error);
    }
}

// 3. Función para pintar las tarjetas en el HTML
function mostrarResultados(elementos) {
    const container = document.getElementById('resultadosContainer');
    if (!container) return;
    container.innerHTML = ''; 

    if (elementos.length === 0) {
        container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #64748b;">❌ No se encontró nada con esa búsqueda o la base de datos está vacía.</p>`;
        return;
    }

    elementos.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <span class="badge">${item.categoria}</span>
            <h3>${item.titulo}</h3>
            <p><strong>Tags:</strong> ${item.tags ? item.tags.join(', ') : ''}</p>
            <div class="card-actions" style="flex-wrap: wrap; gap: 8px;">
                <a href="${item.archivoUrl}" target="_blank" class="btn-action pdf">📄 Ver PDF</a>
                ${item.archivoUrl !== "#" && item.archivoUrl !== "" ? `<button onclick="window.compartirPorWhatsapp('${item.titulo}', '${item.archivoUrl}')" class="btn-action whatsapp" style="border:none; cursor:pointer;">💬 WhatsApp</button>` : ''}
                ${item.qrUrl !== "#" && item.qrUrl !== "" ? `<button onclick="window.abrirModalQR('${item.titulo}', '${item.qrUrl}')" class="btn-action qr" style="border:none; cursor:pointer;">📱 Mostrar QR</button>` : ''}
            </div>
        `;
        container.appendChild(card);
    });
}

// 4. Lógica del Buscador en tiempo real
document.getElementById('buscador').addEventListener('input', (e) => {
    const termino = e.target.value.toLowerCase();
    const filtrados = biblioteca.filter(item => {
        return item.titulo.toLowerCase().includes(termino) || 
               item.categoria.toLowerCase().includes(termino) || 
               (item.tags && item.tags.some(tag => tag.toLowerCase().includes(termino)));
    });
    mostrarResultados(filtrados);
});

// 5. Lógica de los Botones de Filtro
const botonesFiltro = document.querySelectorAll('.btn-filter');
botonesFiltro.forEach(boton => {
    boton.addEventListener('click', (e) => {
        botonesFiltro.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const categoria = e.target.getAttribute('data-category');
        if (categoria === 'todos') {
            mostrarResultados(biblioteca);
        } else {
            const filtrados = biblioteca.filter(item => item.categoria === categoria);
            mostrarResultados(filtrados);
        }
        document.getElementById('buscador').value = '';
    });
});

// ==========================================
// 🔥 LÓGICA DE ADMINISTRACIÓN (BLINDADA)
// ==========================================

// El engranaje abrirá y cerrará el panel usando estilos directos para evitar fallos
const btnToggle = document.getElementById('btnToggleAdmin');
const panel = document.getElementById('panelAdmin');
const formulario = document.getElementById('formularioSubida');

if (btnToggle && panel) {
    btnToggle.addEventListener('click', () => {
        if (panel.style.display === 'none' || panel.style.display === '') {
            panel.style.display = 'block';
        } else {
            panel.style.display = 'none';
        }
    });
}

if (formulario) {
    formulario.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evita que la página se reinicie

        const titulo = document.getElementById('nuevoTitulo').value;
        const categoria = document.getElementById('nuevaCategoria').value;
        const archivoUrl = document.getElementById('nuevoArchivoUrl').value;
        const qrUrl = document.getElementById('nuevoQrUrl').value;
        const tagsTexto = document.getElementById('nuevosTags').value;
        
        // Convertir el texto de las comas en una lista limpia
        const tagsArray = tagsTexto.split(',').map(tag => tag.trim().toLowerCase());

        const nuevoElemento = {
            titulo: titulo,
            categoria: categoria,
            archivoUrl: archivoUrl,
            qrUrl: qrUrl,
            tags: tagsArray
        };

        try {
            // Guardar en la colección de Firebase
            await addDoc(collection(db, "servicios"), nuevoElemento);
            alert("🎉 ¡Guardado con éxito en la nube de Firebase!");
            
            formulario.reset(); // Limpiar cajas de texto
            panel.style.display = 'none'; // Ocultar panel
            
            cargarBibliotecaDesdeFirebase(); // Recargar la lista en pantalla
        } catch (error) {
            console.error("Error al guardar en Firebase: ", error);
            alert("❌ Error al guardar. Revisa la consola.");
        }
    });
}

// ==========================================

// 6. Funciones globales para la interfaz (Modal y WhatsApp)
window.abrirModalQR = function(titulo, urlImagen) {
    const modal = document.getElementById('qrModal');
    document.getElementById('modalTitulo').innerText = titulo;
    document.getElementById('modalImagenQR').src = urlImagen;
    modal.style.display = 'flex';
}

window.compartirPorWhatsapp = function(titulo, urlArchivo) {
    const numeroTelefono = prompt("Introduce el número de WhatsApp del huésped (con código de país, ej: 529841234567):");
    if (!numeroTelefono) return;
    const numeroLimpio = numeroTelefono.replace(/[+\s-]/g, '');
    const mensaje = `🌴 *Hola, es un gusto saludarte de Recepción.* \n\nAquí tienes el documento que solicitaste: *${titulo}*.\n\n👉 Puedes revisarlo en el siguiente enlace:\n${urlArchivo}\n\n¡Que sigas disfrutando tu estancia! ✨`;
    
    const enlaceVirtual = document.createElement('a');
    enlaceVirtual.href = `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(mensaje)}`;
    enlaceVirtual.target = '_blank';
    document.body.appendChild(enlaceVirtual);
    enlaceVirtual.click();
    document.body.removeChild(enlaceVirtual);
}

// Escuchas para cerrar el modal
const modal = document.getElementById('qrModal');
const botonCerrar = document.querySelector('.close-modal');
if(botonCerrar) botonCerrar.addEventListener('click', () => modal.style.display = 'none');
window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

// Arrancar la aplicación descargando los datos de la nube
cargarBibliotecaDesdeFirebase();