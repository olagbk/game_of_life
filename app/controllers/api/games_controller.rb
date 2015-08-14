class Api::GamesController < ApplicationController

  def get_user
    login_token_value = request.headers["x-login-token"]
    user_token = LoginToken.find_by token: login_token_value
    @user = user_token.user
  end

  def index

    @games = Game.where({:user_id=>get_user})

    respond_to do |format|
      format.json { render :json => @games }
    end
  end

  def create
    @game = Game.new(params[:game].permit(:rows, :columns, :name))
    @game.user = get_user
    @game.save!

    @living_cells = params[:living_cells]
    @living_cells.each_with_index do |pair, idx|
      coord_array = pair.last
      @cell = LivingCell.new({:row=>coord_array[0], :column=>coord_array[1]})
      @cell.game = @game
      @cell.save!
    end

    @games = Game.where({:user_id=>get_user})

    respond_to do |format|
      format.json { render :json => @games }
    end

  end

  def destroy
    @game = Game.find(params[:id])
    if @game.user == get_user
      @game.destroy
    end

    @games = Game.where({:user_id=>get_user})
    respond_to do |format|
      format.json { render :json => @games }
    end
  end

  def show
    @game = Game.find(params[:id])
    if @game.user == get_user
      respond_to do |format|
        format.json { render :json => @game.to_json(:include => :living_cells) }
      end
    end
  end
end
