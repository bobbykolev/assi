(function() {
    var accessToken = "5b76a6ebf16349f88252d8b1f5c07c04",
        subscriptionKey = "d0cddf07-6894-4a11-8ae2-c15e40fb3d3d",
        baseUrl = "https://api.api.ai/v1/",

        q = "",
        a = "",
        recognition,
        speakerOn = true,
        waiting = false,
        previousConversation = null,
        assiArrLS = 'assiConversation',
        assiVolLS = 'assiVol',
        //selectors
        $recBtn,
        $input,
        $vol,
        $sbtBtn,
        $respond,
        $volumeBtn,
        $table,
        $delConversation,
        //messages
        messageRecording = "Recording...",
        messageLoading = "Loading...",
        messageCouldntHear = "I couldn't hear you, could you say that again?",
        messageInternalError = "Oh no, there has been an internal server error",
        messageSorry = "I'm sorry, I don't have the answer to that yet.";

    $(document).on('ready', function() {
        $recBtn = $("#rec-btn");
        $input = $("#input");
        $vol = $("#volume");
        $sbtBtn = $("#sbt-btn");
        $respond = $("#respond");
        $recBtn = $("#rec-btn");
        $volumeBtn = $('#volume button');
        $table = $("#conversation-table");
        $delConversation = $("#delete-conversation");

        $sbtBtn.on('click', function(event) {
            event.preventDefault();
            q = $input.val();

            if (q) {
                send();
            }
        });

        $input.keypress(function(event) {
            if (event.which == 13) {
                event.preventDefault();
                q = $input.val();
                send();
            }
        });

        $delConversation.on('click', function(event) {
            event.preventDefault();
            if (window.confirm("Do you really want to delete the conversation history?")) {
                removeConversation();
            }
        });

        if (window.webkitSpeechRecognition) {
            $recBtn.on("click", function(event) {
                event.preventDefault();
                switchRecognition();
            });

            $volumeBtn.on('click', function(event) {
                event.preventDefault();
                $(this).find('i').toggleClass('fa-volume-up').toggleClass('fa-volume-off');
                speakerOn = !speakerOn;
                localStorage.setItem(assiVolLS, speakerOn);
            });
        } else {
            $recBtn.hide();
            $vol.hide();
        }

        renderPreviousConversation();
        setVolumeState();
    });

    //voice related
    function startRecognition() {
        recognition = new webkitSpeechRecognition();

        recognition.onstart = function(event) {
            $respond.text(messageRecording);
            updateRec();
        };
        recognition.onresult = function(event) {
            var text = "";
            recognition.onend = null;

            for (var i = event.resultIndex; i < event.results.length; ++i) {
                text += event.results[i][0].transcript;
            }

            $input.val(text.htmlEscape());
            $sbtBtn.click();

            stopRecognition();
        };
        recognition.onend = function() {
            $respond.text(messageCouldntHear);
            stopRecognition();
        };
        recognition.onerror = function(event) {
            console.log("err", event.error);
        };

        //recognition.continuous = true;
        recognition.lang = "en-US";
        recognition.start();
    }

    function stopRecognition() {
        if (recognition) {
            recognition.stop();
            recognition = null;
        }
        updateRec();
    }

    function updateRec() {
        $recBtn.find("i").toggleClass('fa-microphone').toggleClass('fa-microphone-slash');
    }

    function switchRecognition() {
        if (recognition) {
            stopRecognition();
        } else {
            startRecognition();
        }
    }

    //conversation record, LS
    function prependQA(question, answer) {
        $table.find("tbody").prepend('<tr><td class="mdl-data-table__cell--non-numeric">Assi</td><td>' + answer.htmlEscape() + '</td></tr>');
        $table.find("tbody").prepend('<tr><td class="mdl-data-table__cell--non-numeric">Me</td><td>' + question.htmlEscape() + '</td></tr>');
    }

    function removeConversation(question, answer) {
        $table.find("tbody").html('');
        removeLS();
    }

    function updateLS(question, answer) {
        previousConversation = JSON.parse(localStorage.getItem(assiArrLS));
        if (previousConversation) {
            previousConversation.push({
                q: question,
                a: answer
            });
        } else {
            previousConversation = [{
                q: question,
                a: answer
            }];
        }

        localStorage.setItem(assiArrLS, JSON.stringify(previousConversation));
    }

    function renderPreviousConversation() {
        previousConversation = JSON.parse(localStorage.getItem(assiArrLS));
        if (previousConversation) {
            for (var i = 0; i < previousConversation.length; i++) {
                prependQA(previousConversation[i].q, previousConversation[i].a);
            }
        }
    }

    function removeLS() {
        localStorage.removeItem(assiArrLS);
    }

    function setVolumeState() {
        var currVol = localStorage.getItem(assiVolLS);

        if (currVol == "false" || currVol == false) {
            $volumeBtn.find('i').removeClass('fa-volume-up').addClass('fa-volume-off');
            speakerOn = false;
        } else {
            speakerOn = true;
        }
    }

    //other
    function disableInputs() {
        $input.prop("disabled", true);
        $recBtn.prop("disabled", true);
        $sbtBtn.prop("disabled", true);
    }

    function enableInputs() {
        $input.prop("disabled", false);
        $recBtn.prop("disabled", false);
        $sbtBtn.prop("disabled", false);
    }

    function setInProgressStatus(inProgress) {
        if (inProgress) {
            $respond.text(messageLoading);
            disableInputs();
        } else {
            enableInputs();
        }
    }

    function prepareResponse(val) {
        if (val) {
            if (val.result && val.result.speech) {
                $respond.text(val.result.speech.htmlEscape());
                prependQA(q, val.result.speech);
                updateLS(q, val.result.speech);
            } else {
                $respond.text(messageSorry);
            }
        } else {
            $respond.text(messageInternalError);
        }
    }

    //xhr
    function send() {
        setInProgressStatus(true);

        $.ajax({
            type: "POST",
            url: baseUrl + "query/",
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            headers: {
                "Authorization": "Bearer " + accessToken,
                "ocp-apim-subscription-key": subscriptionKey
            },
            data: JSON.stringify({
                q: q,
                lang: "en"
            }),

            success: function(data) {
                setInProgressStatus(false);

                if (speakerOn && window.speechSynthesis && data.result.speech) {
                    var msg = new SpeechSynthesisUtterance(),
                        voices = window.speechSynthesis.getVoices();

                    msg.voiceURI = "native";
                    msg.text = data.result.speech;
                    msg.lang = "en-US";
                    window.speechSynthesis.speak(msg);
                }

                prepareResponse(data);
            },
            error: function() {
                setInProgressStatus(false);
                prepareResponse(null);
            }
        });
    }

    //html escape
    if (!String.prototype.htmlEscape) {
        String.prototype.htmlEscape = function() {
            var escapedString = this.replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");
            //.replace(/"/g, "&quot;")
            //.replace(/'/g, "&#39;");
            return escapedString;
        };
    }
})();