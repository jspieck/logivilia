<template>
  <ul id="comments-list" class="comments-list">
    <li v-for="comment in getComments()" v-bind:key="comment.id">
      <div class="comment-main-level">
        <div class="comment-avatar">
          <img :src="getUserAvatar(comment.User.userImageId)"/>
          <!-- <img v-if="comment.UserId % 3 == 1" src="@/assets/bear.svg"/>
          <img v-if="comment.UserId % 3 == 2" src="@/assets/chicken.svg"/>
          <img v-if="comment.UserId % 3 == 0" src="@/assets/cat.svg"/> -->
        </div>
        <div class="comment-row">
          <div class="comment-box">
            <div class="comment-head">
              <div :class="comment.User.role == 'Admin' ? ['comment-name', 'by-author'] : 'comment-name'">
                <router-link :to="`/user/${comment.UserId}`" class="navLink">{{comment.User.username}}</router-link>
              </div>
              <span>{{commentDate(comment.date)}}</span>
              <div v-if="commentLevel < 4 && loggedIn" class="comment-action" @click="showReply(comment.id)">
                <ion-icon class="chatbubble" name="chatbubble"></ion-icon>
                <label class="comment-action-label reply-label">Antworten</label>
              </div>
              <div :class="loggedIn ? (userVotes.includes(comment.id) ? ['comment-action', 'upvoted'] : ['comment-action']) :'comment-action-anonymous' " @click="commentUpvote(comment.id)">
                <ion-icon class="comment-heart" name="heart"></ion-icon>
                <label class="comment-action-label">{{comment.upvotes}}</label>
              </div>
            </div>
            <div class="comment-content">{{decodeURIComponent(comment.text)}}</div>
          </div>
          <div v-if="commentLevel < 4" :id="`reply${comment.id}`" :class="activeReply == comment.id ? ['replyInput'] : ['replyInput', 'replyInactive']">
            <textarea
              :id="`comment-input-area${comment.id}`"
              class="comment-input"
              v-model="userComments[comment.id]"
              placeholder="Deine Replik..."
            ></textarea>
            <div class="divsend">
              <button @click="sendComment(comment.id)"><span>Replik abschicken</span><ion-icon class="sendIcon" name="paper-plane-sharp"></ion-icon></button>
              <div id="danke-box0" class="dankeBox replyInactive">Danke für den Kommentar!</div>
            </div>
          </div>
          <Comments :comments="comments" :commentLevel="commentLevel + 1" :userVotes="userVotes" :replyId="comment.id"/>
        </div>
      </div>
    </li>
  </ul>
</template>

<script>
import { ref, computed } from 'vue';
import { useMainStore } from '@/store/store';
import { storeToRefs } from 'pinia';
import CommentUpvoteService from '@/services/CommentUpvoteService';

export default {
  name: "Comments",
  props: {
    comments: {
      type: Array,
      required: true
    },
    replyId: {
      type: Number,
      required: true
    },
    commentLevel: {
      type: Number,
      required: true
    },
    userVotes: {
      type: Array,
      required: true
    }
  },
  setup(props, { emit }) {
    const store = useMainStore();
    const { isUserLoggedIn } = storeToRefs(store);
    const activeReply = ref(-1);
    const userComments = ref({});

    const loggedIn = computed(() => isUserLoggedIn.value);

    const initUserState = () => {
      console.log("Init Comment", getComments());
      for (const c of getComments()) {
        userComments.value[c.id] = "";
      }
    };

    const getUserAvatar = (id) => {
      const paths = ["bear", "chicken", "cat"];
      const index = id == null ? 0 : id % paths.length;
      return new URL(`../assets/${paths[index]}.svg`, import.meta.url).href;
    };

    const getComments = () => {
      return props.comments.filter(m => m.replyId == props.replyId);
    };

    const sendComment = (commentId) => {
      emit('send-comment', userComments.value[commentId], commentId);
    };

    const commentDate = (d) => {
      let diff = new Date(Date.now()) - new Date(d);
      console.log(diff, new Date(Date.now()), new Date(d));
      // ms to s
      diff /= 1000;
      if(diff < 60)
        return "Vor unter einer Minute";
      else if(diff < 60 * 2)
        return "Vor über einer Minute";
      else if(diff < 60 * 60)
        return `Vor über ${Math.floor(diff / 60)} Minuten`;
      else if(diff < 60 * 60 * 2)
        return "Vor über einer Stunde";
      else if(diff < 60 * 60 * 24)
        return `Vor über ${Math.floor(diff / (60 * 60))} Stunden`;
      else if(diff < 60 * 60 * 24 * 2)
        return "Vor über einem Tag";
      else if(diff < 60 * 60 * 24 * 365)
        return `Vor über ${Math.floor(diff / (60 * 60 * 24))} Tagen`;
      else if(diff < 60*60*24*365*2)
        return "Vor über einem Jahr";
      return `Vor über ${Math.floor(diff / (60 * 60 * 24 * 365.5))} Jahren`;
    };

    const showReply = (commentId) => {
      if (loggedIn.value) {
        activeReply.value = commentId === activeReply.value ? -1 : commentId;
      }
    };

    const commentUpvote = async (commentId) => {
      if (props.userVotes.includes(commentId)) {
        await CommentUpvoteService.delete(commentId);
        const comment = props.comments.find(c => c.id === commentId);
        if (comment) comment.upvotes -= 1;
        emit('update:userVotes', props.userVotes.filter(item => item !== commentId));
      } else {
        await CommentUpvoteService.post(commentId);
        const comment = props.comments.find(c => c.id === commentId);
        if (comment) comment.upvotes += 1;
        emit('update:userVotes', [...props.userVotes, commentId]);
      }
    };

    return {
      activeReply,
      userComments,
      loggedIn,
      initUserState,
      getUserAvatar,
      getComments,
      sendComment,
      commentDate,
      showReply,
      commentUpvote
    };
  }
};
</script>

<style>
.comment-action-label {
  vertical-align: text-bottom;
  margin-left: 3px;
  cursor: pointer;
}
#mainComment {
  width: 100%;
  height: 75px;
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  border: none;
}
.sendIcon {
  width: 20px;
  height: 20px;
  float: right;
  margin-left: 5px;
}
.divsend {
  position: relative;
  margin-top: 10px;
}
.dankeBox {
  position: absolute;
  left: 50px;
  color: white;
  top: 7px;
  padding: 3px;
  border-radius: 4px;
  background-color: #1568a0;
}
.dankeBox:after {
  content: "";
  height: 0;
  width: 0;
  position: absolute;
  display: block;
  border-width: 6px 10px 6px 0;
  border-style: solid;
  border-color: transparent #1568a0;
  top: 7px;
  left: -10px;
}
.replyInactive {
  display: none;
}
.replyActive {
  display: block;
}

.replyInput {
  margin-top: 10px;
}

.comment-area {
  position: relative;
  width: 100%;
  margin: 0;
  padding: 0;
  margin-bottom: -15px;
  box-sizing: border-box;
}
.comment-area a {
  color: #03658c;
  text-decoration: none;
}
.comment-area ul {
  list-style-type: none;
}
#content h6 {
  padding-bottom: 0px;
}
.comment-area h6 {
  margin: 0px;
  padding-bottom: 0px;
}
#content ul ul {
  margin-bottom: 0;
  margin-left: 0px;
  margin-right: 0px;
}

/** ====================
 * Lista de Comentarios
 =======================*/
.comments-container {
  margin: 0 auto;
  /*margin: 60px auto 15px;*/
}

.comments-container h1 {
  font-family: "Roboto", Arial, Helvetica, Sans-serif, Verdana;
  font-size: 36px;
  color: #283035;
  font-weight: 400;
}

.comments-container h1 a {
  font-size: 18px;
  font-weight: 700;
}

.comments-list {
  position: relative;
  padding-left: 0;
}
.comments-list li:first-child {
  margin-top: 20px;
}
/* .comments-list:after {
  content: "";
  position: absolute;
  background: #c7cacb;
  bottom: 0;
  left: 27px;
  width: 7px;
  height: 7px;
  border: 3px solid #dee1e3;
  -webkit-border-radius: 50%;
  -moz-border-radius: 50%;
  border-radius: 50%;
} */

.comments-list li {
  margin-bottom: 15px;
  position: relative;
}

.comments-list li:after {
  content: "";
  display: block;
  clear: both;
  height: 0;
  width: 0;
}

/**
 * Avatar
 ---------------------------*/
.comments-list .comment-avatar {
  width: 65px;
  height: 65px;
  position: relative;
  z-index: 99;
  float: left;
  border-radius: 37%;
  overflow: hidden;
}

.comments-list .comment-avatar img {
  width: 100%;
  height: 100%;
}

.reply-list .comment-avatar {
  width: 50px;
  height: 50px;
}
.comment-main-level {
  display: grid;
  grid-template-columns: .001fr 1fr;
  grid-auto-rows: minmax(0,auto);
  grid-column-gap: 20px;
  padding-left: 0;
  border-left: 1px solid #e2e2e2;
  padding-left: 10px;
  border-left: 4px solid #9d9dff;
  padding: 10px;
  padding-left: 10px;
  background: #c3c3c34f;
}
.comment-main-level:after {
  content: "";
  width: 0;
  height: 0;
  display: block;
  clear: both;
}

.comment-main-level .comment-main-level {
  border-left: 4px solid #ff9da4;
}

.comment-main-level .comment-main-level .comment-main-level  {
  border-left: 4px solid #ffff9d;
}

.comment-main-level .comment-main-level .comment-main-level .comment-main-level {
  border-left: 4px solid #9dffa3;
}
/**
 * Caja del Comentario
 ---------------------------*/
.comments-list .comment-box {
  position: relative;
  box-shadow: 0 2px 2px rgba(0, 0, 0, 0.15);
}

.comments-list .comment-box:before,
.comments-list .comment-box:after {
  content: "";
  height: 0;
  width: 0;
  position: absolute;
  display: block;
  border-width: 10px 12px 10px 0;
  border-style: solid;
  border-color: transparent #fcfcfc;
  top: 8px;
  left: -11px;
}

.comments-list .comment-box:before {
  border-width: 11px 13px 11px 0;
  border-color: transparent rgba(0, 0, 0, 0.05);
  border-color: transparent rgb(0 0 0 / 15%);
  left: -12px;
}

.comment-box .comment-head {
  background: #fcfcfc;
  padding: 7px 12px;
  border-bottom: 1px solid #e5e5e5;
  overflow: hidden;
  -webkit-border-radius: 4px 4px 0 0;
  -moz-border-radius: 4px 4px 0 0;
  border-radius: 4px 4px 0 0;
}

.comment-box .comment-head .comment-action, .comment-box .comment-head .comment-action-anonymous {
  float: right;
  margin-left: 14px;
  position: relative;
  top: 2px;
  color: #6f6f6f;
  transition: color 0.3s ease;
}
.comment-box .comment-head .comment-action {
  cursor: pointer;
}

.comment-box .comment-head .comment-action:hover {
  color: #03658c;
}

.comment-box .comment-head .comment-action:hover .comment-heart,
.comment-box .comment-head .comment-action.upvoted .comment-heart {
  color: #d42020;
}

.comment-box .comment-name {
  color: #283035;
  font-size: 14px;
  font-weight: 700;
  float: left;
  margin-right: 10px;
}

.comment-box .comment-name a {
  color: #283035;
}

.comment-box .comment-head span {
  float: left;
  color: #999;
  font-size: 13px;
  position: relative;
  top: 1px;
}

.comment-box .comment-content {
  background: #fff;
  background: #efefef;
  padding: 12px;
  font-size: 15px;
  color: #595959;
  border-radius: 0 0 4px 4px;
}

.comment-box .comment-name.by-author,
.comment-box .comment-name.by-author a {
  color: #03658c;
}
.comment-box .comment-name.by-author:after {
  content: "Admin";
  background: #6c6c6c;
  color: #fff;
  font-size: 12px;
  padding: 3px 5px;
  font-weight: 700;
  margin-left: 10px;
  -webkit-border-radius: 3px;
  -moz-border-radius: 3px;
  border-radius: 3px;
}

/** =====================
 * Responsive
 ========================*/
@media only screen and (max-width: 1078px) {
  .comments-container {
  }

  .comments-list .comment-box {
  }
}

@media only screen and (max-width: 767px) {
  .comment-main-level {
    display: block;
  }
  .comment-main-level .comment-avatar {
    display: none;
  }
  .comments-list .comment-box:before, .comments-list .comment-box:after {
    display: none;
  }
  .by-author:after {
    display: none;
  }
}
@media only screen and (max-width: 480px) {
  .comments-container {
  }
  .comments-list .comment-box {
  }
  .comment-main-level {
    display: block;
  }
  .comment-main-level .comment-avatar {
    display: none;
  }
  .comments-list .comment-box:before, .comments-list .comment-box:after {
    display: none;
  }
  .by-author:after {
    display: none;
  }
  .reply-label {
    display: none;
  }
  .bodyContainer {
    overflow-y: scroll;
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none;  /* Internet Explorer 10+ */
  }
  .bodyContainer::-webkit-scrollbar { /* WebKit */
      width: 0;
      height: 0;
  }
}
</style>