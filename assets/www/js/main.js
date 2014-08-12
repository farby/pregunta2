var respCorrecta = -1;
var timer;

function getDatos(){
    $.ajax({
        type: "GET",
        dataType: "json",
        url: "http://innvenio.com/ort/taller_julio_2014/get.php",
        success: function(response){
            loadBD(response);
            console.log(response);
        },
        error: function(jqXHR, error){
            console.log(jqXHR.status + " " + error);
            loadBD(databkp);
        }
    });
}

function saveRespuesta(idPre, idRes){
    bd.transaction(
        function(tx){
            tx.executeSql("INSERT INTO Contestadas VALUES(?, ?)", [idPre, idRes]);
        },
        function(error){
            console.log(error);
        },
        function(){
            console.log("respuesta guardada");
        }
    );
}

function loadCategorias(){
    querySql("SELECT * FROM Categorias", function(result){
        $("#lstCategorias").html("");
        for(i = 0; i < result.length; i++){
            var id = result[i].idCategoria;
            var categoria = result[i].categoria;
            $("#lstCategorias").append('<li><a href="#pregunta" class="btnCat" data-idcat="' + id + '">' + categoria + '</a></li>');
        }
        $(".btnCat").unbind("click");
        $(".btnCat").click(genPregunta);
        $("#lstCategorias").listview().listview("refresh");
    });
}

function loadPregunta(idPre){
    if(timer != undefined){
        timer.destroy();
    }
    querySql("SELECT * FROM Preguntas p, Respuestas r WHERE p.idPregunta = r.idPregunta AND p.idPregunta = " + idPre, 
    function(result){
        $("#lblPregunta").html("");
        $("#lblPregunta").html(result[0].pregunta);
        $("#lstRespuestas").html("");
        for(i = 0; i < result.length; i++){
            var id = result[i].numRespuesta;
            var respuesta = result[i].respuesta;
            //data-rel="popup" data-transition="pop"
            $("#lstRespuestas").append('<li><a href="#resultado" class="btnRes" data-idres="' + id + '">' + respuesta + '</a></li>');
        }
        respCorrecta = result[0].respCorrecta;
        $(".btnRes").unbind("click");
        $(".btnRes").click(
            function(){
                respSeleccionada = $(this).attr("data-idres");
                evalRespuesta(idPre, respSeleccionada);
            });
        $("#lstRespuestas").listview("refresh");
        genTimer(idPre);
    });
}

function genPregunta(){
    var idPre;
    idCat = $(this).attr("data-idcat");
    querySql("SELECT idPregunta FROM Preguntas WHERE idPregunta NOT IN (SELECT idPregunta FROM Contestadas) AND idCategoria = " + idCat,
    function(result){
        if(result.length == 0){
            $("#lblPregunta").html("");
            $("#lblPregunta").html("No hay más preguntas en esta Categoría. Selecciona otra!");
            $("#lstRespuestas").html("");
            $("#timer").html("<img src='img/sad.gif' style='width: 100px'>");
        }
        else{
            var disponibles = [];
            for(i = 0; i < result.length; i++){
                disponibles.push(result[i].idPregunta);
            }
            idPre = disponibles[Math.floor((Math.random() * disponibles.length))];
            loadPregunta(idPre);
            $("#timer").html("");
        }
    });
    
}

function timeOut(idPre){
    $(".btnRes").unbind("click");
    $(".btnRes").addClass("ui-disabled");
    $(".btnRes").css("background-color", "red");
    $(".btnRes[data-idres='" + respCorrecta + "']").css("background-color", "green");
    $(".btnRes").css("color", "white");
    saveRespuesta(idPre, 0);
}

function evalRespuesta(idPre, respSeleccionada){
    //respSeleccionada = $(this).attr("data-idres");
    $(".btnRes").unbind("click");
    $(".btnRes").addClass("ui-disabled");
    $(".btnRes").css("color", "white");
    console.log(respSeleccionada);
    if(respCorrecta != respSeleccionada){
        $(".btnRes[data-idres='" + respSeleccionada + "']").css("background-color", "red");
    }
    $(".btnRes[data-idres='" + respCorrecta + "']").css("background-color", "green");
    console.log(respSeleccionada);
    saveRespuesta(idPre, respSeleccionada);
    timer.stop();
    setTimeout(function(){
        $.mobile.changePage("#categorias", {transition: "flip"});
    }, 1500);
}

function genTimer(idPre){
    timer = $("#timer").TimeCircles({
        time: {
            Days: {show: false},
            Hours: {show: false},
            Minutes: {show: false},
            Seconds: {color: "red"}
        },
        count_past_zero: true,
        total_duration: 10
    }).addListener(
        function(unit,value,total){
            if(total < 0){
                timer.stop();
                timeOut(idPre);
                setTimeout(function(){
                    $.mobile.changePage("#categorias", {transition: "flip"});
                }, 1500);
            }
        }
    );
}

function resetHistorial(){
    querySql("DELETE FROM Contestadas", function(){
        $.mobile.navigate("#main");
    });
}

function estadisticas(){
    consulta = "SELECT a.idCategoria, totales, contestadas, correctas FROM " +
    "((SELECT P.idCategoria, COUNT(*) AS totales FROM Preguntas P WHERE P.idPregunta GROUP BY P.idCategoria) a LEFT JOIN " +
    "(SELECT P.idCategoria, COUNT(*) AS contestadas FROM Preguntas P, Contestadas C WHERE P.idPregunta = C.idPregunta GROUP BY P.idCategoria) b ON a.idCategoria = b.idCategoria) LEFT JOIN " +
    "(SELECT P.idCategoria, COUNT(*) AS correctas FROM Preguntas P, Contestadas C WHERE P.idPregunta = C.idPregunta AND c.numRespuesta = P.respCorrecta GROUP BY P.idCategoria) c ON c.idCategoria = b.idCategoria";
    querySql(consulta, function(result){
        console.log(result);
        $(".pEst").remove();
        for(j = 0; j < result.length; j++){
            var cat = result[j].idCategoria;
            var tot = result[j].totales;
            var con = result[j].contestadas;
            if(con == null){con = 0;}
            var cor = result[j].correctas;
            if(cor == null){cor = 0;}
            var inc = con - cor;
            $("div[data-idcat='" + cat + "'] h3 a").append("<p class='pEst'>Totales " + tot + " - Contestadas " + con + " - Bien " + cor + " - Mal " + inc + "</p>");
        }
    });
}

function historicoPorCategorias(){
    querySql("SELECT P.idCategoria, P.pregunta, Rc.respuesta as correcta, R.respuesta as seleccionada " +
        "FROM Contestadas C INNER JOIN Preguntas P ON C.idPregunta = P.idPregunta " +
        "INNER JOIN Respuestas Rc ON P.respCorrecta = Rc.numrespuesta and P.idPregunta = Rc.idPregunta " +
        "LEFT JOIN Respuestas R ON R.idPregunta = C.idPregunta and C.numRespuesta = R.numRespuesta", function(result){
        $(".catHistorial div").html("");
        for(j = 0; j < result.length; j++){
            var categoria = result[j].idCategoria;
            var txtPregunta = result[j].pregunta;
            var respCorrecta = result[j].correcta;
            var respSeleccionada = result[j].seleccionada;  
            if(respSeleccionada == null){respSeleccionada = "No contestó";}
            $(".catHistorial[data-idcat='" + categoria + "'] div").append(
                "<p>Pregunta: " + txtPregunta +
                "<br>Respuesta seleccionada: " + respSeleccionada +
                "<br>Respuesta correcta: " + respCorrecta + "</p><hr>"
            );          
        }
        $(this).parent().parent().collapsible("refresh");
    });
}

/*function setDificultad(dif){
    if(timer != undefined){
        timer.destroy();
    }
    timer.rebuild();
    tMax = parseInt(dif);
    $("#timer").attr("data-timer", dif);
}*/

$(document).ready(init);

$(document).on("pagecreate", "#estadisticas", function(){
    console.log("a");
    querySql("SELECT * FROM Categorias", function(result){
       $("#lstEstadisticas").html("");
       for(i = 0; i < result.length; i++){
            var id = result[i].idCategoria;
            var categoria = result[i].categoria;
            $("#lstEstadisticas").append('<div data-role="collapsible" class="catHistorial" data-idcat="' + id + '"><h3>' + categoria + '</h3><p></p></div>'); 
        }
       $("#lstEstadisticas").collapsibleset("refresh");
    });
});

$(document).on("pageshow", "#estadisticas", function(){
    historicoPorCategorias();
    estadisticas();
});

function init(){
    bd = window.openDatabase("pregunta2BD", "1.0", "Pregunta2", 1024*1024*5);
    buildBD();
    $("#btnPlay").click(function(){
        $.mobile.changePage("#categorias", {transition: "flow"});         
    });   
    /*$(".btnDif").click(function(){
        setDificultad($(this).attr("name"));
    });*/
    $(".btnIni").attr("data-transition", "pop"); 
    $(".btnEst").attr("data-transition", "slideup"); 
    $(".btnCat").attr("data-transition", "slide"); 
    $(".btnOpt").attr("data-transition", "fade"); 
    $(".btnRst").click(resetHistorial);
}
