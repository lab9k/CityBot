import {
  ActivityHandler,
  BotState,
  UserState,
  StatePropertyAccessor,
  TurnContext,
} from 'botbuilder';
import { ILogger } from './logger';
import { Dialog, DialogState, DialogContext } from 'botbuilder-dialogs';
import { MainDialog } from './dialogs';
import { checkNested, isFacebook } from './util';

export class NalantisBot extends ActivityHandler {
  private conversationState: BotState;
  private userState: UserState;
  private logger: ILogger;
  private dialog: Dialog;
  private dialogState: StatePropertyAccessor<DialogState>;
  private docsAccessor: StatePropertyAccessor<QueryResponse.QueryResponse>;

  constructor(
    converstationState: BotState,
    userState: UserState,
    dialog: Dialog,
    logger: ILogger = console as ILogger,
  ) {
    super();

    this.conversationState = converstationState;
    this.userState = userState;
    this.dialog = dialog;
    this.logger = logger;

    this.dialogState = this.conversationState.createProperty<DialogState>(
      'DialogState',
    );
    this.docsAccessor = this.userState.createProperty('resolved_data');

    this.onMessage(this.handleMessage.bind(this));
    this.onMembersAdded(this.handleMembersAdded.bind(this));
    this.onDialog(this.handleDialog.bind(this));
  }

  private async handleMessage(
    context: TurnContext,
    next: () => Promise<void>,
    exceptionDetected?: boolean,
  ) {
    if (exceptionDetected) return;
    this.logger.log('Running dialog with Message Activity.');

    // Run the Dialog with the new message Activity.
    if (await this.exceptionMessageOccured(context, next)) return;
    await (this.dialog as MainDialog).run(
      context,
      this.dialogState,
      this.docsAccessor,
    );
    // Save any state changes. The load happened during the execution of the Dialog.
    await this.conversationState.saveChanges(context, false);
    await this.userState.saveChanges(context, false);

    await next();
  }
  private async exceptionMessageOccured(
    context: TurnContext,
    next: () => Promise<void>,
  ): Promise<boolean> {
    const act = context.activity;
    if (
      isFacebook(act) &&
      checkNested(act.channelData, 'postback', 'payload') &&
      act.channelData.postback.payload === 'get_started'
    ) {
      // ? Welcome new facebook user.
      await context.sendActivity('Hello en welcome!');
      await this.handleMessage(context, next, true);
      return true;
    }

    return false;
  }

  private async handleMembersAdded(
    context: TurnContext,
    next: () => Promise<void>,
  ) {
    const membersAdded = context.activity.membersAdded;
    for (const member of membersAdded) {
      if (member.id !== context.activity.recipient.id) {
        await context.sendActivity('Hello en welcome!');
        await this.handleMessage(context, next);
      }
    }
    // By calling next() you ensure that the next BotHandler is run.
    await next();
  }
  private async handleDialog(context: TurnContext, next: () => Promise<void>) {
    // Save any state changes. The load happened during the execution of the Dialog.
    await this.conversationState.saveChanges(context, false);
    await this.userState.saveChanges(context, false);

    // By calling next() you ensure that the next BotHandler is run.
    await next();
  }
}