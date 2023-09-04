const fs = require("fs")
const mongoose = require("mongoose")
const util = require('util')
const transcripts = fs.readdirSync("./data")
const { getAudioDurationInSeconds } = require('get-audio-duration')

const ObjectId = mongoose.Types.ObjectId

const transcript = async () => {
    const transcriptDetails = await Promise.all(transcripts.map(async element => {
        const text = fs.readFileSync("./data/" + element, "utf-8")
        const fragments = text.split("\n").filter((txt) => txt.length > 0)

        const audioName = element.replace(".txt", ".wav").replace("medium-", "")
        const audioLength = await getAudioDurationInSeconds("./audios/" + audioName)

        const audio = {
            name: audioName,
            length: audioLength,
            convo: []
        }

        let lastSpeaker

        fragments.forEach((line) => {

            if (line.includes("SPEAKER")) {
                lastSpeaker = line.split("SPEAKER")[1].split(" ").filter((el) => el.length > 0)[0]
            } else {
                // AGREGAR AL ARREGLO CORRESPONDIENTE
                const speakText = {
                    speaker: `SPEAKER ${lastSpeaker}`,
                    message: line
                }
                audio.convo.push(speakText)
            }
        })

        return audio
    }));

    mongoose.connect("mongodb://127.0.0.1:27017/nlp-audios")

    const Audio = mongoose.models.Audio ?? mongoose.model("Audio", new mongoose.Schema({
        audioName: String,
        length: Number,
        status: {
            type: Number,
            default: 0
        },
        sentTo: {
            type: [ObjectId] // USER ID
        } ,
        classifiedAt: {
            type: Date,
            default: new Date()
        }
    }))

    const ClassificationDetail = mongoose.models.ClassificationDetail ?? mongoose.model("ClassificationDetail", new mongoose.Schema({
        classifiedBy: String,
        newLabel: String,
        classifiedAt: {
            type: Date,
            default: new Date()
        }
    }))

    const Conversation = mongoose.models.Conversation ?? mongoose.model("Conversation", new mongoose.Schema({
        audioId: ObjectId,
        originalSpeaker: String,
        message: String,
        labeledTranscriptions: {
            type: [ClassificationDetail.schema]
        }
    }))



    console.log(util.inspect(transcriptDetails, false, null, true /* enable colors */))

    const arrayAudios = transcriptDetails.map((audio) => {
        const AudioModel = new Audio({
            audioName: audio.name,
            length: audio.length
        })

        return AudioModel
    })

    const createdAudios = await Audio.insertMany(arrayAudios)

    const ConversationsArray = []

    for (let i = 0; i < transcriptDetails.length; i++) {
        const audioId = createdAudios[i]._id

        for (const convo of transcriptDetails[i].convo) {
            const conversation = new Conversation({
                audioId: new ObjectId(audioId),
                originalSpeaker: convo.speaker,
                message: convo.message
            })

            ConversationsArray.push(conversation)
        }

    }

    await Conversation.insertMany(ConversationsArray)

}

transcript()

/*
export const Audio = mongoose.models.Audio ?? mongoose.model("Audio", new Schema({
    audioName: String,
    // classifiedBy: String, // Reference to User ID
    status: {

        type: Number,

    },
    classifiedAt: {
        type: Date,

    }
}))

export const ClassificationDetail = mongoose.models.ClassificationDetail ?? mongoose.model("ClassificationDetail", new Schema({
    classifiedBy: String,
    newLabel: String,
    classifiedAt: Date
}))

export const Conversation = mongoose.models.Conversation ?? mongoose.model("Conversation", new Schema({
    audioId: String,
    originalSpeaker: String,
    message: String,
    
    labeledTranscriptions: {
        type: [ClassificationDetail.schema]
    }
}))

export const User =mongoose.models.User ?? mongoose.model("User", new Schema({
    username: {
        type: String,
        unique: true
    },
    password: String,
    firstName: String,
    lastName: String,
    createdAt: {
        type: Date,
        default: new Date()
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    dailyGoal: {
        type: Number,
        default: 100
    }
}))
*/

