// 1. Importar los módulos necesarios de Firebase desde internet (Versión estable)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Tu configuración real de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCpur4nfcoQhR29ipilRPNu4W_ySFbQ9Xc", 
  authDomain: "biblioteca-andante.firebaseapp.com",
  projectId: "biblioteca-andante",
  storageBucket: "biblioteca-andante.firebasestorage.app",
  messagingSenderId: "907474616559",
  appId: "1:907474616559:web:c1942ac42716a2a1d89b1a"
};

// Inicializar Firebase y Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 2. CONFIGURACIÓN DE CLOUDINARY INTEGRADA
const CLOUD_NAME = "dlujpxqkt"; 
const UPLOAD_PRESET = "biblioteca_preset"; 

let biblioteca = [];

// Descargar los datos desde Firebase Firestore
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

// 3. Función para pintar las tarjetas en el HTML con botones de Reemplazar
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
                <a href="${item.archivoUrl}" target="_blank" class="btn-action pdf">📄 Ver PDF / Enlace</a>
                ${item.archivoUrl !== "#" && item.archivoUrl !== "" ? `<button onclick="window.compartirPorWhatsapp('${item.titulo}', '${item.archivoUrl}')" class="btn-action whatsapp" style="border:none; cursor:pointer;">💬 WhatsApp</button>` : ''}
                <button onclick="window.prepararEdicion('${item.id}')" class="btn-action editar" style="border:none; cursor:pointer; background:#0ea5e9; color:white;">✏️ Reemplazar</button>
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
// 🔥 LÓGICA DE ADMINISTRACIÓN (ENGRANAJE)
// ==========================================
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

// ==========================================
// 📁 INTERFAZ DRAG & DROP -> CLOUDINARY (CORREGIDA)
// ==========================================
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const dropZoneTexto = document.getElementById('dropZoneTexto');
const hiddenUrlInput = document.getElementById('nuevoArchivoUrl');

if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            subirArchivoACloudinary(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            subirArchivoACloudinary(e.target.files[0]);
        }
    });
}

async function subirArchivoACloudinary(file) {
    dropZoneTexto.innerHTML = `⏳ Subiendo archivo: <strong>${file.name}</strong>...`;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('resource_type', 'auto'); 

    try {
        const respuesta = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
            method: 'POST',
            body: formData
        });

        const data = await respuesta.json();
        if (data.secure_url) {
            let urlLimpia = data.secure_url;
            
            // FILTRO CORRECTOR: Si termina en .ai, cambiamos la extensión del enlace a .pdf
            if (urlLimpia.toLowerCase().endsWith('.ai')) {
                urlLimpia = urlLimpia.slice(0, -3) + '.pdf';
            }
            
            hiddenUrlInput.value = urlLimpia;
            dropZoneTexto.innerHTML = `✅ ¡Archivo listo para guardar! (${file.name})`;
            dropZone.style.borderColor = "#22c55e";
        } else {
            throw new Error("No se recibió la URL de Cloudinary");
        }
    } catch (error) {
        console.error("Error en Cloudinary:", error);
        dropZoneTexto.innerHTML = `❌ Error al subir. Revisa el Upload Preset en Cloudinary.`;
        dropZone.style.borderColor = "#ef4444";
    }
}

// ==========================================
// ✏️ SISTEMA DE EDICIÓN / REEMPLAZAR ARCHIVO (REFORZADO)
// ==========================================
window.prepararEdicion = function(id) {
    const item = biblioteca.find(i => i.id === id);
    if (!item) return;

    // Rellenar de forma segura validando la existencia de los ID en el HTML
    if(document.getElementById('editandoId')) document.getElementById('editandoId').value = item.id;
    if(document.getElementById('nuevoTitulo')) document.getElementById('nuevoTitulo').value = item.titulo || '';
    if(document.getElementById('nuevaCategoria')) document.getElementById('nuevaCategoria').value = item.categoria || 'restaurante';
    if(document.getElementById('nuevosTags')) document.getElementById('nuevosTags').value = item.tags ? item.tags.join(', ') : '';
    
    // Asignar URLs de manera segura
    if(document.getElementById('nuevoArchivoUrl')) document.getElementById('nuevoArchivoUrl').value = item.archivoUrl || '#';
    if(document.getElementById('nuevoArchivoUrlManual')) document.getElementById('nuevoArchivoUrlManual').value = item.archivoUrl === "#" ? "" : (item.archivoUrl || '');
    if(document.getElementById('nuevoQrUrl')) document.getElementById('nuevoQrUrl').value = item.qrUrl || '#';

    // Cambiar textos visuales del Formulario
    if(document.getElementById('formTitulo')) document.getElementById('formTitulo').innerText = "🔄 Reemplazar / Editar Documento";
    if(document.getElementById('btnGuardar')) document.getElementById('btnGuardar').innerText = "💾 Actualizar Cambios";
    if(document.getElementById('btnCancelarEdicion')) document.getElementById('btnCancelarEdicion').style.display = "block";
    
    if(document.getElementById('dropZoneTexto')) document.getElementById('dropZoneTexto').innerHTML = "Arrastra un archivo nuevo si deseas reemplazar el actual";
    if(dropZone) dropZone.style.borderColor = "#cbd5e1";
    
    // Desplazamiento suave al panel
    const adminPanel = document.getElementById('panelAdmin');
    if(adminPanel) adminPanel.scrollIntoView({ behavior: 'smooth' });
};

const btnCancelar = document.getElementById('btnCancelarEdicion');
if (btnCancelar) {
    btnCancelar.addEventListener('click', resetearFormulario);
}

function resetearFormulario() {
    if(formulario) formulario.reset();
    if(document.getElementById('editandoId')) document.getElementById('editandoId').value = "";
    if(document.getElementById('nuevoArchivoUrl')) document.getElementById('nuevoArchivoUrl').value = "#";
    if(document.getElementById('nuevoQrUrl')) document.getElementById('nuevoQrUrl').value = "#";
    if(document.getElementById('nuevoArchivoUrlManual')) document.getElementById('nuevoArchivoUrlManual').value = "";
    if(document.getElementById('formTitulo')) document.getElementById('formTitulo').innerText = "Subir Nuevo Documento / QR";
    if(document.getElementById('btnGuardar')) document.getElementById('btnGuardar').innerText = "🚀 Guardar en la Nube";
    if(document.getElementById('btnCancelarEdicion')) document.getElementById('btnCancelarEdicion').style.display = "none";
    if(document.getElementById('dropZoneTexto')) document.getElementById('dropZoneTexto').innerHTML = "Arrastra tu PDF/Imagen aquí o <strong>haz clic para buscar</strong>";
    if(dropZone) dropZone.style.borderColor = "#cbd5e1";
}

// ==========================================
// 💾 GUARDAR O ACTUALIZAR EN FIREBASE (SUBMIT)
// ==========================================
if (formulario) {
    formulario.addEventListener('submit', async (e) => {
        e.preventDefault();

        const idEditando = document.getElementById('editandoId').value;
        const titulo = document.getElementById('nuevoTitulo').value;
        const categoria = document.getElementById('nuevaCategoria').value;
        const urlManual = document.getElementById('nuevoArchivoUrlManual').value;
        const urlCloudinary = document.getElementById('nuevoArchivoUrl').value;
        const urlQrExistente = document.getElementById('nuevoQrUrl').value;
        
        // Prioridad al input manual, si está vacío usa la URL que dejó Cloudinary
        const archivoUrlDefinitivo = urlManual.trim() !== "" ? urlManual : urlCloudinary;
        const tagsTexto = document.getElementById('nuevosTags').value;
        const tagsArray = tagsTexto.split(',').map(tag => tag.trim().toLowerCase());

        const datosMenu = {
            titulo: titulo,
            categoria: categoria,
            archivoUrl: archivoUrlDefinitivo,
            qrUrl: urlQrExistente, // Mantener compatibilidad de datos
            tags: tagsArray
        };

        try {
            if (idEditando) {
                await updateDoc(doc(db, "servicios", idEditando), datosMenu);
                alert("🔄 ¡Documento actualizado con éxito!");
            } else {
                await addDoc(collection(db, "servicios"), datosMenu);
                alert("🎉 ¡Guardado con éxito en la nube de Firebase!");
            }
            
            resetearFormulario();
            cargarBibliotecaDesdeFirebase(); 
        } catch (error) {
            console.error("Error al procesar en Firebase:", error);
            alert("❌ Error de comunicación con la base de datos.");
        }
    });
}

// ==========================================
// 💬 COMPARTIR POR WHATSAPP
// ==========================================
window.compartirPorWhatsapp = function(titulo, urlArchivo) {
    const numeroTelefono = prompt("Introduce el número de WhatsApp del huésped (con código de país, ej: 529841234567):");
    if (!numeroTelefono) return;
    const numeroLimpio = numeroTelefono.replace(/[+\s-]/g, '');
    const mensaje = `🌴 *Hola, es un gusto saludarte de Recepción.* \n\nAquí tienes el documento que solicitaste: *${titulo}*.\n\n👉 Puedes revisarlo en el siguiente enlace:\n${urlArchivo}\n\n¡Que sigas disfrutando tu estancia! ✨`;
    
    const enlaceVirtual = document.createElement('a');
    enlaceVirtual.href = `https://wa.me/${numeroLinter || numeroLimpio}?text=${encodeURIComponent(mensaje)}`;
    enlaceVirtual.target = '_blank';
    document.body.appendChild(enlaceVirtual);
    enlaceVirtual.click();
    document.body.removeChild(enlaceVirtual);
};

// Arrancar la aplicación descargando los datos de la nube
cargarBibliotecaDesdeFirebase();
