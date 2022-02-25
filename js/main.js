const headers = {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aWJ0bmlvbGRyemZ1d3FkYm9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDU0Mzg0MTQsImV4cCI6MTk2MTAxNDQxNH0.MRHqlD-XVFfY2VAxxmKWu1_CENQKV6kWo6MSPc7xmBw',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aWJ0bmlvbGRyemZ1d3FkYm9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDU0Mzg0MTQsImV4cCI6MTk2MTAxNDQxNH0.MRHqlD-XVFfY2VAxxmKWu1_CENQKV6kWo6MSPc7xmBw',
    'Content-Type': 'application/json',
    // para el paginador
    'Range': '0-99'
}

Vue.createApp({
    data() {
        return {
            // Metemos la ruta invariable de nuestra propia API creada con Supabase
            peliculas: [],
            peliculasOmdb: [],
            // Para poner manualmente algunas duraciones
            duracionesPeliculasOmdb: [120, 90, 150, 60],
            // Si no añades page en el endpoint, devuelve la página 1 (solo 10 elementos siempre)
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
            numeroResultadosPorPagina: 5,
            // Para calcular luego el núm. de páginas que hay
            paginasTotales: 0
        }
    },
    methods: {
        getHeaders() {
            const rangoInicio = (this.pag - 1) * this.numeroResultadosPorPagina;
            const rangoFinal = rangoInicio + this.numeroResultadosPorPagina;
            // Clono headers
            let headersNuevoRango = JSON.parse(JSON.stringify(headers));
            // Modifico su rango
            /* Como Range coge tanto el inicio como el final, NO como slice, necesitamos un condicional */
            if (rangoInicio === 0) {
                // Si no le restamos 1, nos cogería 6 elementos
                headersNuevoRango.Range = `${rangoInicio}-${rangoFinal - 1}`;
                return headersNuevoRango;
            } else {
                // Si no le sumamos 1, la siguiente pág. empieza por el último elemento de la anterior
                headersNuevoRango.Range = `${rangoInicio + 1}-${rangoFinal}`;
                return headersNuevoRango;
            }
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
                    // Las claves de las columnas que teníamos en la tabla de nuestra base
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
        // Cogemos películas de otra API. Get
        async obtenerPeliculasOmdb() {
            // Como solo devuelve 10 elementos por página y queremos 100 películas:
            for (let i = 1; i <= 10; i += 1) {
                const miFetch = await fetch(`${this.urlOmdb}&page=${i}`);
                const jsonData = await miFetch.json();
                // Vamos metiendo los resultados de cada pág. en nuestro array
                this.peliculasOmdb = this.peliculasOmdb.concat(jsonData.Search);
                console.log(this.peliculasOmdb);
                // Cuando ya tenemos las 100 películas, llamamos a la siguiente función
                if (this.peliculasOmdb.length === 100) {
                    this.anyadirPeliculasOmdb();
                }
            }
        },
        // Publicamos esas películas en nuestra base de datos. Post
        async anyadirPeliculasOmdb() {
            // Añadimos la película a la base de datos
            this.peliculasOmdb.forEach((pelicula) => {
                fetch(this.urlApi,
                    {
                        headers: this.getHeaders(),
                        method: "POST",
                        body: JSON.stringify({"name": pelicula.Title, "duration": this.cogerDuracionRandomPeliculaOmdb()})
                    }
                );
            })
        },
        cogerDuracionRandomPeliculaOmdb() {
            const duracion =  this.duracionesPeliculasOmdb[Math.floor(Math.random()*this.duracionesPeliculasOmdb.length)];
            return duracion;
        },
        calcularNumeroPaginas() {
            return Math.ceil(this.peliculasOmdb.length / this.numeroResultadosPorPagina);
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