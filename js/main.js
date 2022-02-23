const headers = {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aWJ0bmlvbGRyemZ1d3FkYm9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDU0Mzg0MTQsImV4cCI6MTk2MTAxNDQxNH0.MRHqlD-XVFfY2VAxxmKWu1_CENQKV6kWo6MSPc7xmBw',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aWJ0bmlvbGRyemZ1d3FkYm9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDU0Mzg0MTQsImV4cCI6MTk2MTAxNDQxNH0.MRHqlD-XVFfY2VAxxmKWu1_CENQKV6kWo6MSPc7xmBw',
    'Content-Type': 'application/json',
    // para el paginador
    'Range': '0-9'
}

Vue.createApp({
    data() {
        return {
            // Metemos la ruta invariable de nuestra propia API creada con Supabase
            peliculas: [],
            peliculasOmdb: [],
            urlOmdb: "http://www.omdbapi.com/?apikey=8714c357&s=hombre",
            urlApi: "https://yyibtnioldrzfuwqdbob.supabase.co/rest/v1/películas",
            verFormulario: false,
            nuevoNombre: "",
            nuevaDuracion: "",
            // Para la barra de progreso que hemos metido
            isLoading: false,
            // Para el botón de editar
            peliculasEditables: -1,
            editarNombre: "",
            editarDuracion: "",
            // Para paginador
            pag: 1,
            numeroResultadosPorPagina: 5
        }
    },
    methods: {
        getHeaders() {
            const rangoInicio = (this.pag - 1) * this.numeroResultadosPorPagina;
            const rangoFinal = rangoInicio + this.numeroResultadosPorPagina;
            // Clono headers
            let headersNuevoRango = JSON.parse(JSON.stringify(headers));
            // Modifico el rango
            headersNuevoRango.Range = `${rangoInicio}-${rangoFinal}`;
            return headersNuevoRango;
        },
        // Simplemente leemos lo que ya hay en la base de datos y lo mostramos
        async obtenerPeliculas() {
            this.isLoading = true;
            const fetchPeliculas = await fetch(`${this.urlApi}?select=*`, {headers: this.getHeaders()});
            this.peliculas = await fetchPeliculas.json();
            this.isLoading = false;
        },
        // El usuario puede añadir una nueva. Modifica la base de datos. Post
        async anyadirPelicula() {
            this.isLoading = true;
            // Ocultamos el formulario
            this.verFormulario = false;
            // Añadimos la película a la base de datos
            const fetchPeliculas = await fetch(this.urlApi,
                {
                    headers: this.getHeaders(),
                    method: "POST",
                    body: JSON.stringify({"name": this.nuevoNombre, "duration": this.nuevaDuracion})
                }
            );
            // Limpiamos el formulario
            this.nuevoNombre = "";
            this.nuevaDuracion = "";
            // Mostramos las películas de nuevo
            this.obtenerPeliculas();
            this.isLoading = false;
        },
        // Borramos de la base de datos. Delete
        async borrarPelicula(id) {
            const fetchPeliculas = await fetch(`${this.urlApi}?id=eq.${id}`,
                {
                    headers: this.getHeaders(),
                    method: "DELETE"
                }
            );
            this.obtenerPeliculas();
        },
        // Añadimos la película al set
        verPelicula(id) {
            this.peliculasEditables = id;
            // Obtenemos la info del JSON
            const peliculaAEditar = this.peliculas.filter(function(pelicula) {
                // Nos devuelve el JSON
                return pelicula.id === id;
            })[0];
            // Mostramos los datos
            this.editarNombre = peliculaAEditar.name;
            this.editarDuracion = peliculaAEditar.duration;
        },
        // Para editar al pulsar el botón. Post
        async editarPelicula(id) {
            this.isLoading = true;
            this.peliculasEditables = -1;
            const fetchPeliculas = await fetch(`${this.urlApi}?id=eq.${id}`,
                {
                    headers: this.getHeaders(),
                    method: "PATCH",
                    body: JSON.stringify({"name": this.editarNombre, "duration": this.editarDuracion})
                }
            );
            this.obtenerPeliculas();
            this.isLoading = false;
        },
        // Cogemos películas de otra API
        async obtenerPeliculasOmdb() {
            const miFetch = await fetch(this.urlOmdb);
            const jsonData = await miFetch.json();
            this.peliculasOmdb = jsonData.Search;
            console.log(this.peliculasOmdb);
            this.anyadirPeliculasOmdb();
        },
        // Publicamos esas películas en nuestra base de datos
        anyadirPeliculasOmdb() {
            // Añadimos la película a la base de datos
            this.peliculasOmdb.forEach((pelicula) => {
                fetch(this.urlApi,
                    {
                        headers: this.getHeaders(),
                        method: "POST",
                        body: JSON.stringify({"name": pelicula.Title, "duration": 120})
                    }
                );
            })
        }
    },
    watch: {
        // Para que funcione la barra de progreso externa
        isLoading(value) {
            // Si es true, activamos
            if (value) {
                NProgress.start();
            // Si es false, desactivamos
            } else {
                NProgress.done();
            }
        },
        // Vuelve a mostrar las películas cuando cambiamos de página
        pag(value) {
            this.obtenerPeliculas();
        }
    },
    mounted() {
        this.obtenerPeliculas();
        this.obtenerPeliculasOmdb();
    }
}).mount('#app')