var bd;

function buildBD(){
    bd.transaction(
        function(tx){
            tx.executeSql("CREATE TABLE IF NOT EXISTS Categorias(idCategoria INTEGER PRIMARY KEY, categoria TEXT)");
            tx.executeSql("CREATE TABLE IF NOT EXISTS Preguntas(idPregunta INTEGER PRIMARY KEY, pregunta TEXT, idCategoria INTEGER, respCorrecta INTEGER, FOREIGN KEY(idCategoria) REFERENCES Categorias(idCategoria))");
            tx.executeSql("CREATE TABLE IF NOT EXISTS Respuestas(idPregunta INTEGER, numRespuesta INTEGER, respuesta TEXT, PRIMARY KEY(idPregunta, numRespuesta))");//, FOREIGN KEY(idPregunta) REFERENCES Preguntas(idPregunta))");
            tx.executeSql("CREATE TABLE IF NOT EXISTS Contestadas(idPregunta INTEGER, numRespuesta INTEGER)");
        },
        function(error){
            console.log(error);
        },
        function(){
            console.log("tablas creadas");
            getDatos();
        }
    );
}

function loadBD(data){
    bd.transaction(
        function(tx){
            tx.executeSql("DELETE FROM Categorias");
            tx.executeSql("DELETE FROM Preguntas");
            tx.executeSql("DELETE FROM Respuestas");
            for(i = 0; i < data.listado.length; i++){
                tx.executeSql("INSERT INTO Categorias VALUES(?, ?)",
                [data.listado[i].categoria.id, data.listado[i].categoria.nombre]);
                for(j = 0; j < data.listado[i].preguntas.length; j++){
                    tx.executeSql("INSERT INTO Preguntas VALUES(?, ?, ?, ?)", [
                        data.listado[i].preguntas[j].id,
                        data.listado[i].preguntas[j].pregunta,
                        data.listado[i].categoria.id,
                        data.listado[i].preguntas[j].id_opcion_correcta
                    ]);
                    for(k = 0; k < data.listado[i].preguntas[j].opciones.length; k++){
                        tx.executeSql("INSERT INTO Respuestas VALUES(?, ?, ?)", [
                            data.listado[i].preguntas[j].id,
                            data.listado[i].preguntas[j].opciones[k].id,
                            data.listado[i].preguntas[j].opciones[k].opcion
                        ]);
                    }
                }
            }
        },
        function(error){
            console.log(error);
        },
        function(){
            console.log("datos cargados");
            loadCategorias();
        }
    );
}

function querySql(sql, callback){
    bd.transaction(
        function(tx){
            tx.executeSql(sql, [], 
            function(tx, result){
                var vec = [];
                //vec.push(result.rows.item(1));
                
                for(i = 0; i < result.rows.length; i++){
                    vec.push(result.rows.item(i));
                }
                callback(vec);
            });
        }
    );
}